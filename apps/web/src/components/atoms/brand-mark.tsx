/**
 * BrandMark — the ResponseGrid logo glyph: an accent rounded square holding an
 * upward navy triangle. Decorative; the readable name lives in BrandLogo.
 */
interface BrandMarkProps {
  /** Square side length in px. */
  size?: number;
  className?: string;
}

export function BrandMark({ size = 26, className = '' }: BrandMarkProps) {
  const half = Math.round(size * 0.23);
  const height = Math.round(size * 0.38);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center bg-accent ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: Math.max(4, Math.round(size * 0.23)) }}
    >
      <span
        style={{
          width: 0,
          height: 0,
          borderLeft: `${half}px solid transparent`,
          borderRight: `${half}px solid transparent`,
          borderBottom: `${height}px solid var(--color-navy)`,
        }}
      />
    </span>
  );
}
