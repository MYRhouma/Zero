import { authProxy } from './auth-proxy';

export interface YachtbaseSession {
  user: {
    id: string;
    email?: string;
  };
  tenant?: {
    id: string;
  };
}

export async function getYachtbaseSession(headers: Headers): Promise<YachtbaseSession | null> {
  const session = await authProxy.api.getSession({ headers });

  if (!session?.user?.id) return null;

  const candidate = session as typeof session & {
    tenant?: { id?: string };
  };

  return {
    user: {
      id: session.user.id,
      ...(session.user.email ? { email: session.user.email } : {}),
    },
    ...(candidate.tenant?.id ? { tenant: { id: candidate.tenant.id } } : {}),
  };
}

export function emailInboxUrl(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const inboxPath = pathname.startsWith('/dashboard/email')
    ? '/dashboard/email/mail/inbox'
    : '/mail/inbox';
  return new URL(inboxPath, request.url).toString();
}

export function yachtbaseLoginUrl(request: Request, next = '/dashboard/email/mail/inbox'): string {
  const pathname = new URL(request.url).pathname;
  // The mounted product keeps Better Auth's existing login boundary until the
  // platform's Django session is formally bridged to the email service.
  const loginPath = pathname.startsWith('/dashboard/email') ? '/dashboard/email/login' : '/login';
  const url = new URL(loginPath, request.url);
  url.searchParams.set('next', next);
  return url.toString();
}

export function redirectToEmailInbox(request: Request): Response {
  return Response.redirect(emailInboxUrl(request));
}

export function redirectToYachtbaseLogin(request: Request): Response {
  return Response.redirect(yachtbaseLoginUrl(request));
}
