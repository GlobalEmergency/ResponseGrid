import type { Locale } from '@/i18n';

interface DistanceBadgeProps {
  distanceMeters: number;
  locale: Locale;
  label?: string;
}

// <1000 m → "a 850 m"; ≥1000 m → "a 2,3 km" (es) / "a 2.3 km" (en).
export function DistanceBadge({ distanceMeters, locale, label = 'a' }: DistanceBadgeProps) {
  let text: string;

  if (distanceMeters < 1000) {
    text = `${label} ${Math.round(distanceMeters)} m`;
  } else {
    const km = distanceMeters / 1000;
    const formatted = km.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    text = `${label} ${formatted} km`;
  }

  return (
    <span className="text-xs font-semibold text-info bg-info-soft rounded-full px-2 py-0.5">
      {text}
    </span>
  );
}
