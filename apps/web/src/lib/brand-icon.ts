/**
 * Canonical ResponseGrid icon as a standalone SVG string + data URI.
 *
 * Used by the next/og icon generators (apple-icon, PWA maskable PNGs), which
 * rasterise it via an <img> data URI — resvg renders full SVG (strokes, etc.)
 * reliably, unlike Satori's partial inline-SVG support. The on-page glyph lives
 * in <BrandMark>; both share the same shape.
 */
export const BRAND_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
  '<circle cx="32" cy="32" r="30" fill="#e8740e"/>' +
  '<path d="M32 15.5 50.5 47.5 13.5 47.5 Z" fill="#112b4a" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"/>' +
  '<circle cx="32" cy="15.5" r="4.3" fill="#ffffff"/><circle cx="32" cy="15.5" r="1.9" fill="#e8740e"/>' +
  '<circle cx="13.5" cy="47.5" r="4.3" fill="#ffffff"/><circle cx="13.5" cy="47.5" r="1.9" fill="#e8740e"/>' +
  '<circle cx="50.5" cy="47.5" r="4.3" fill="#ffffff"/><circle cx="50.5" cy="47.5" r="1.9" fill="#e8740e"/>' +
  '</svg>';

export function brandIconDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(BRAND_ICON_SVG).toString('base64')}`;
}
