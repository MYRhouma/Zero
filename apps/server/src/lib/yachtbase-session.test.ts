import { describe, expect, it } from 'vitest';
import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { verifyYachtbaseMailSession } from './yachtbase-session';

describe('Yachtbase mail session bridge', () => {
  it('accepts only a signed session assertion for one tenant and user', async () => {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA');
    const pem = await exportSPKI(publicKey);
    const sign = (scope: string) => new SignJWT({ scope, userId: 'user-1', tenantId: 'tenant-1', name: 'Ada Lovelace', email: 'ada@example.test' })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setIssuer('yachtbase')
      .setAudience('zero-email')
      .setIssuedAt()
      .setExpirationTime('30s')
      .sign(privateKey);
    await expect(verifyYachtbaseMailSession(await sign('session'), pem)).resolves.toEqual({
      userId: 'user-1', tenantId: 'tenant-1', zeroUserId: 'yachtbase:tenant-1:user-1',
      name: 'Ada Lovelace', email: 'ada@example.test',
    });
    await expect(verifyYachtbaseMailSession(await sign('workspace'), pem)).rejects.toThrow();
    const stranger = await generateKeyPair('EdDSA');
    const forgery = await new SignJWT({ scope: 'session', userId: 'user-2', tenantId: 'tenant-1' })
      .setProtectedHeader({ alg: 'EdDSA' }).setIssuer('yachtbase').setAudience('zero-email')
      .setIssuedAt().setExpirationTime('30s').sign(stranger.privateKey);
    await expect(verifyYachtbaseMailSession(forgery, pem)).rejects.toThrow();
  });
});
