import { OAuth2Client } from 'google-auth-library';
import { eq } from 'drizzle-orm';
import { importSPKI, jwtVerify } from 'jose';
import { createYachtbaseWorkspaceRouter, type WorkspaceIdentity } from '../routes/yachtbase-workspace';
import { createDb } from '../db';
import { connection, user } from '../db/schema';
import { env } from '../env';
import { EProviders } from '../types';
import { createDriver } from './driver';
import { getZeroDB } from './server-utils';
import { redis } from './services';
import { requireGoogleMailboxConsent } from './mailbox-consent';

const CALLBACK = 'https://app.yachtbase.co/dashboard/email-api/api/auth/callback/google';
const internalId = (identity: WorkspaceIdentity) => `yachtbase:${identity.tenantId}:${identity.userId}`;
const oauth = () => new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, CALLBACK);
const scopes = ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.modify', 'openid', 'email', 'profile'];

export const yachtbaseWorkspace = createYachtbaseWorkspaceRouter({
  async validate(token) {
    const key = await importSPKI(env.YACHTBASE_EMAIL_PUBLIC_KEY || '', 'EdDSA');
    const { payload } = await jwtVerify(token, key, { algorithms: ['EdDSA'], issuer: 'yachtbase', audience: 'zero-email', maxTokenAge: '30s' });
    if (typeof payload.userId !== 'string' || typeof payload.tenantId !== 'string' || typeof payload.scope !== 'string' || typeof payload.name !== 'string' && payload.name !== undefined) throw new Error('Invalid SaaS identity');
    return { userId: payload.userId, tenantId: payload.tenantId, name: typeof payload.name === 'string' ? payload.name : 'Yachtbase member', scope: payload.scope };
  },
  providers: () => env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [{ id: 'google', name: 'Gmail' }] : [],
  async list(identity) {
    const { db, conn } = createDb(env.HYPERDRIVE.connectionString);
    try {
      const rows = await db.select({ id: connection.id, email: connection.email, name: connection.name, providerId: connection.providerId }).from(connection).where(eq(connection.userId, internalId(identity)));
      return rows;
    } finally { await conn.end(); }
  },
  async saveState(state, owner) { await redis().set(`yachtbase:email:oauth:${state}`, owner, { ex: 600 }); },
  async takeState(state) { return redis().getdel<{ userId: string; tenantId: string }>(`yachtbase:email:oauth:${state}`); },
  authorizationUrl: (state) => oauth().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes, state }),
  async connect(identity, code) {
    const { tokens } = await oauth().getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) throw new Error('Mailbox consent is incomplete');
    const grantedScope = requireGoogleMailboxConsent(tokens.scope);
    const id = internalId(identity);
    const driver = createDriver('google', { auth: { userId: id, email: '', accessToken: tokens.access_token, refreshToken: tokens.refresh_token } });
    const info = await driver.getUserInfo();
    if (!info.address) throw new Error('Mailbox address unavailable');
    const { db, conn } = createDb(env.HYPERDRIVE.connectionString);
    try {
      // A deterministic tenant/user ID keeps unrelated Zero accounts separate.
      // No mailbox is automatically claimed just because its email matches.
      await db.insert(user).values({ id, name: identity.name, email: `${identity.userId}.${identity.tenantId}@identity.yachtbase.invalid`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() }).onConflictDoNothing({ target: user.id });
      const zeroDb = await getZeroDB(id);
      const [created] = await zeroDb.createConnection(EProviders.google, info.address, {
        name: info.name, picture: info.photo, accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
        scope: grantedScope, expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
      } as Parameters<typeof zeroDb.createConnection>[2]);
      // The first account becomes default; reconnecting never changes the owner.
      const current = await db.query.user.findFirst({ where: eq(user.id, id) });
      if (!current?.defaultConnectionId) await db.update(user).set({ defaultConnectionId: created.id, updatedAt: new Date() }).where(eq(user.id, id));
    } finally { await conn.end(); }
  },
});

export function yachtbaseOAuthCallback(request: Request): Response | null {
  const source = new URL(request.url);
  if (!source.searchParams.get('state')?.startsWith('yb_')) return null;
  const target = new URL('https://api.yachtbase.co/api/v1/integrations/email-workspace/callback/');
  for (const key of ['state', 'code', 'error']) {
    const value = source.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return new Response(null, { status: 302, headers: { Location: target.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
