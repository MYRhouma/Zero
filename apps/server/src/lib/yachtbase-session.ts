import { importSPKI, jwtVerify } from 'jose';

export type YachtbaseMailIdentity = {
  userId: string;
  tenantId: string;
  zeroUserId: string;
  name: string;
  email: string;
};

/** Only a Yachtbase mail-session assertion can authenticate the mounted Zero UI. */
export async function verifyYachtbaseMailSession(
  token: string,
  publicKey: string,
): Promise<YachtbaseMailIdentity> {
  if (!publicKey) throw new Error('Yachtbase email signing key is missing');
  const key = await importSPKI(publicKey, 'EdDSA');
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['EdDSA'],
    issuer: 'yachtbase',
    audience: 'zero-email',
    maxTokenAge: '30s',
  });
  if (
    payload.scope !== 'session' ||
    typeof payload.userId !== 'string' ||
    typeof payload.tenantId !== 'string' ||
    !payload.userId ||
    !payload.tenantId
  ) {
    throw new Error('Invalid Yachtbase mail session');
  }
  return {
    userId: payload.userId,
    tenantId: payload.tenantId,
    zeroUserId: `yachtbase:${payload.tenantId}:${payload.userId}`,
    name: typeof payload.name === 'string' && payload.name ? payload.name : 'Yachtbase member',
    email: typeof payload.email === 'string' ? payload.email : '',
  };
}
