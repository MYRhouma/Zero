export const EMAIL_BASE_PATH = '/dashboard/email';
export const LEGACY_EMAIL_BASE_PATH = '/dashboard/email-inbox';

export function toCanonicalEmailPath(pathname: string, search = ''): string {
  if (pathname === LEGACY_EMAIL_BASE_PATH) {
    return `${EMAIL_BASE_PATH}${search}`;
  }

  if (pathname.startsWith(`${LEGACY_EMAIL_BASE_PATH}/`)) {
    return `${EMAIL_BASE_PATH}${pathname.slice(LEGACY_EMAIL_BASE_PATH.length)}${search}`;
  }

  return `${pathname}${search}`;
}
