import { Hono } from 'hono';

export type WorkspaceIdentity = { userId: string; tenantId: string; name: string; scope: string };
type Owner = Pick<WorkspaceIdentity, 'userId' | 'tenantId'>;
export type WorkspaceDependencies = {
  validate: (token: string) => Promise<WorkspaceIdentity>;
  list: (identity: WorkspaceIdentity) => Promise<unknown[]>;
  providers: () => { id: string; name: string }[];
  saveState: (state: string, owner: Owner) => Promise<void>;
  takeState: (state: string) => Promise<Owner | null>;
  authorizationUrl: (state: string) => string;
  connect: (identity: WorkspaceIdentity, code: string) => Promise<void>;
};

export function createYachtbaseWorkspaceRouter(deps: WorkspaceDependencies) {
  const app = new Hono<{ Variables: { identity: WorkspaceIdentity } }>();
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    const auth = c.req.header('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return c.json({ error: 'SaaS authentication required' }, 401);
    try {
      const identity = await deps.validate(auth.slice(7));
      const action = c.req.path.split('/').at(-1);
      if (identity.scope !== action) return c.json({ error: 'Permission denied' }, 403);
      c.set('identity', identity);
    } catch {
      return c.json({ error: 'SaaS authentication required' }, 401);
    }
    await next();
  });
  app.get('/workspace', async (c) => c.json({ connections: await deps.list(c.var.identity), providers: deps.providers() }));
  app.post('/connect', async (c) => {
    const body = await c.req.json<{ provider?: string }>();
    if (body.provider !== 'google' || !deps.providers().some((p) => p.id === body.provider)) return c.json({ error: 'Provider unavailable' }, 400);
    const state = `yb_${crypto.randomUUID()}`;
    await deps.saveState(state, { userId: c.var.identity.userId, tenantId: c.var.identity.tenantId });
    return c.json({ url: deps.authorizationUrl(state), state });
  });
  app.post('/complete', async (c) => {
    const body = await c.req.json<{ state?: string; code?: string; error?: string }>();
    if (!body.state?.startsWith('yb_') || body.state.length > 100) return c.json({ error: 'Invalid state' }, 400);
    const owner = await deps.takeState(body.state);
    if (!owner) return c.json({ error: 'Expired connection request' }, 400);
    if (owner.userId !== c.var.identity.userId || owner.tenantId !== c.var.identity.tenantId) return c.json({ error: 'Identity changed' }, 403);
    if (body.error) return c.json({ status: 'cancelled' });
    if (!body.code) return c.json({ error: 'Missing authorization code' }, 400);
    await deps.connect(c.var.identity, body.code);
    return c.json({ status: 'connected' });
  });
  app.onError((_error, c) => c.json({ error: 'Email is temporarily unavailable. Please retry.' }, 503));
  return app;
}
