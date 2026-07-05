import ipaddr from 'ipaddr.js';

/**
 * Cloudflare's published edge ranges (https://www.cloudflare.com/ips/, IPv4 +
 * IPv6). Refresh occasionally — they change rarely. Only requests whose
 * immediate peer is one of these are allowed to declare a `CF-Connecting-IP`.
 */
const CLOUDFLARE_CIDRS: readonly [ipaddr.IPv4 | ipaddr.IPv6, number][] = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
].map((cidr) => ipaddr.parseCIDR(cidr));

/** True when `ip` is inside a Cloudflare edge range (IPv4 or IPv6). */
export function isCloudflareIp(ip: string | undefined): boolean {
  if (!ip) return false;
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.process(ip); // normalises v4-mapped IPv6 to IPv4
  } catch {
    return false;
  }
  return CLOUDFLARE_CIDRS.some(([range, bits]) => {
    if (range.kind() !== addr.kind()) return false;
    return (addr as ipaddr.IPv4).match(range as ipaddr.IPv4, bits);
  });
}

/**
 * Real client IP for the `Cloudflare → Caddy → API` chain, hardened for the
 * case where the origin is ALSO reachable directly (bypassing Cloudflare).
 *
 * `CF-Connecting-IP` carries the original client only when the request actually
 * came through Cloudflare — a client hitting the origin directly can forge it.
 * So we trust the header ONLY when the immediate peer (`req.ip`, resolved via
 * Express `trust proxy`) is a Cloudflare edge address; otherwise we key off the
 * peer IP itself (the unforgeable TCP source). This prevents a direct attacker
 * from poisoning or evading the per-IP rate limit with a spoofed header.
 */
export function clientIp(req: {
  headers?: Record<string, string | string[] | undefined> | undefined;
  ip?: string | undefined;
}): string {
  const peer = req.ip ?? '';
  if (!isCloudflareIp(peer)) return peer;
  const header = req.headers?.['cf-connecting-ip'];
  const cf = Array.isArray(header) ? header[0] : header;
  return typeof cf === 'string' && cf.length > 0 ? cf : peer;
}
