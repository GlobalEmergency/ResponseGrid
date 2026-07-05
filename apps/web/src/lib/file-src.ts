/**
 * Maps a stored-file reference (a bare storage key, a `/files/<key>` path, or an
 * absolute `…/files/<key>` URL) to the same-origin authenticated proxy route
 * `/api/files/<key>`.
 *
 * Files are no longer world-readable on the API; they must be fetched through
 * the session-authenticated proxy (see app/api/files/[key]/route.ts). Truly
 * external URLs (that don't point at our files endpoint) are returned as-is.
 */
export function fileSrc(urlOrKey: string): string {
  const marker = '/files/';
  const idx = urlOrKey.indexOf(marker);
  if (idx !== -1) {
    return `/api/files/${urlOrKey.slice(idx + marker.length)}`;
  }
  if (/^https?:\/\//i.test(urlOrKey)) {
    // Absolute URL that is not one of our file references — leave untouched.
    return urlOrKey;
  }
  // Bare storage key.
  return `/api/files/${urlOrKey.replace(/^\//, '')}`;
}
