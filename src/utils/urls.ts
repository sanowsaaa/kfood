export const DEFAULT_SITE_URL = 'https://k-foodvelikotarnovo.com';

// Accept both the relative paths and absolute URLs used by existing callers.
export function absoluteSiteUrl(path: string, siteUrl = DEFAULT_SITE_URL): string {
  return new URL(path, `${siteUrl.replace(/\/+$/, '')}/`).href;
}
