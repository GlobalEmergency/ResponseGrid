/**
 * BrandMark — the ResponseGrid logo glyph.
 *
 * Based on the Global Emergency civil-protection emblem (orange disc + a
 * white-bordered navy triangle) with a ResponseGrid twist: glowing nodes at the
 * triangle's three vertices, evoking a connected grid of response points.
 *
 * Pure multicolour SVG so it reads on both navy bands and light surfaces. Also
 * rendered by next/og (Satori) for the favicon, apple-icon and PWA icons.
 */
interface BrandMarkProps {
  /** Square side length in px. */
  size?: number;
  className?: string;
  /** When set, the glyph is exposed to assistive tech with this label. */
  title?: string;
}

export function BrandMark({ size = 26, className = '', title }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="32" cy="32" r="30" fill="#e8740e" />
      <path
        d="M32 15.5 50.5 47.5 13.5 47.5 Z"
        fill="#112b4a"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      {/* Response nodes — the connected-grid twist on the emblem. */}
      <g>
        <circle cx="32" cy="15.5" r="4.3" fill="#ffffff" />
        <circle cx="32" cy="15.5" r="1.9" fill="#e8740e" />
        <circle cx="13.5" cy="47.5" r="4.3" fill="#ffffff" />
        <circle cx="13.5" cy="47.5" r="1.9" fill="#e8740e" />
        <circle cx="50.5" cy="47.5" r="4.3" fill="#ffffff" />
        <circle cx="50.5" cy="47.5" r="1.9" fill="#e8740e" />
      </g>
    </svg>
  );
}
