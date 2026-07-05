/**
 * Real client IP for the `Cloudflare → Caddy → API` chain.
 *
 * With Cloudflare in front, Express `req.ip` (even with `trust proxy`) resolves
 * to a Cloudflare *edge* IP, so every visitor behind the same edge would share a
 * rate-limit bucket. Cloudflare sets `CF-Connecting-IP` to the original client
 * on every request, so we key off that and fall back to `req.ip` when absent
 * (e.g. local dev / requests that never traversed Cloudflare).
 *
 * SECURITY: `CF-Connecting-IP` is only trustworthy while the origin accepts
 * traffic *exclusively* through Cloudflare — otherwise an attacker hitting the
 * EC2 origin directly can forge it. Lock the origin to Cloudflare IP ranges
 * (security group / Caddy) or use Authenticated Origin Pulls.
 */
export function clientIp(req: {
  headers?: Record<string, string | string[] | undefined> | undefined;
  ip?: string | undefined;
}): string {
  const header = req.headers?.['cf-connecting-ip'];
  const cf = Array.isArray(header) ? header[0] : header;
  if (typeof cf === 'string' && cf.length > 0) return cf;
  return req.ip ?? '';
}
