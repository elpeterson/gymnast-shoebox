/**
 * Return `next` only if it is a same-origin path, else `fallback`.
 *
 * Guards the auth callback against open redirects: `//evil.com` and
 * `/\evil.com` both resolve off-site under `new URL(next, base)`.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!next || !next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}
