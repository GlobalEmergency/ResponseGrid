/**
 * BrandLogo — BrandMark + "ResponseGrid" wordmark. Colour is inherited from the
 * parent (text-current), so it sits on navy bands (white) or light surfaces (navy).
 */
import { BrandMark } from '@/components/atoms/brand-mark';

interface BrandLogoProps {
  /** Glyph side length in px. */
  size?: number;
  /** Extra classes for the wordmark text (size/colour overrides). */
  wordmarkClassName?: string;
  className?: string;
}

export function BrandLogo({
  size = 26,
  wordmarkClassName = 'text-base',
  className = '',
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <BrandMark size={size} />
      <span className={`font-display font-extrabold tracking-tight ${wordmarkClassName}`.trim()}>
        ResponseGrid
      </span>
    </span>
  );
}
