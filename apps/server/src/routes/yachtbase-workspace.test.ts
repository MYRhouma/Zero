import { describe, it, expect } from 'vitest';
import { createYachtbaseWorkspaceRouter, type WorkspaceDependencies } from './yachtbase-workspace';

const identity = { userId: 'u1', tenantId: 't1', name: 'Test', scope: 'workspace' };
function setup() {
  const states = new Map<string, { userId: string; tenantId: string }>();
  let connected = 0;
  const deps: WorkspaceDependencies = {
    validate: async (token) => {
      if (!token.startsWith('valid-')) throw new Error('unauthorized');
      return { ...identity, scope: token.slice(6) };
    },
    list: async () => [],
    providers: () => [{ id: 'google', name: 'Gmail' }],
    saveState: async (state, owner) => { states.set(state, owner); },
    takeState: async (state) => { const owner = states.get(state); states.delete(state); return owner ?? null; },
    authorizationUrl: (state) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
    connect: async () => { connected++; },
  };
  return { app: createYachtbaseWorkspaceRouter(deps), states, connected: () => connected };
}
const request = (app: ReturnType<typeof setup>['app'], path: string, scope: string, body?: object) => app.request(path, {
  method: body ? 'POST' : 'GET',
  headers: { Authorization: `Bearer valid-${scope}`, 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

describe('native Yachtbase mailbox connection', () => {
  it('rejects an unrelated Better Auth cookie', async () => {
    const { app } = setup();
    expect((await app.request('/workspace', { headers: { cookie: 'better-auth.session_token=other' } })).status).toBe(401);
  });
  it('returns a no-mailbox state for a validated SaaS identity', async () => {
    const { app } = setup();
    const res = await request(app, '/workspace', 'workspace');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connections: [], providers: [{ id: 'google', name: 'Gmail' }] });
  });
  it('binds OAuth to the tenant and user and consumes the state once', async () => {
    const { app, connected } = setup();
    const start = await request(app, '/connect', 'connect', { provider: 'google' });
    const { state } = await start.json() as { state: string };
    expect(state).toMatch(/^yb_/);
    expect((await request(app, '/complete', 'complete', { state, code: 'code' })).status).toBe(200);
    expect((await request(app, '/complete', 'complete', { state, code: 'code' })).status).toBe(400);
    expect(connected()).toBe(1);
  });
  it('rejects a callback belonging to another user or tenant', async () => {
    const { app, states, connected } = setup();
    states.set('yb_other', { userId: 'other', tenantId: 't2' });
    expect((await request(app, '/complete', 'complete', { state: 'yb_other', code: 'code' })).status).toBe(403);
    expect(connected()).toBe(0);
  });
  it('rejects unsupported providers and wrong ticket scope', async () => {
    const { app } = setup();
    expect((await request(app, '/connect', 'connect', { provider: 'unknown' })).status).toBe(400);
    expect((await request(app, '/connect', 'workspace', { provider: 'google' })).status).toBe(403);
  });
  it('consumes a cancelled connection without provisioning a mailbox', async () => {
    const { app, states, connected } = setup();
    states.set('yb_cancel', identity);
    const res = await request(app, '/complete', 'complete', { state: 'yb_cancel', error: 'access_denied' });
    expect(await res.json()).toEqual({ status: 'cancelled' });
    expect(connected()).toBe(0);
    expect(states.has('yb_cancel')).toBe(false);
  });
});
