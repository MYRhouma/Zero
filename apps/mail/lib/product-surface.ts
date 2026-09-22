const STANDALONE_PRODUCT_PATHS = new Set([
  '/about',
  '/pricing',
  '/privacy',
  '/terms',
  '/contributors',
  '/hr',
  '/developer',
  '/login',
]);

export function isStandaloneProductPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';

  for (const path of STANDALONE_PRODUCT_PATHS) {
    if (normalized === path || normalized.startsWith(`${path}/`)) return true;
  }

  return false;
}
