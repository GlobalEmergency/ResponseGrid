import { Badge } from '@/components/atoms/badge';
import type { Messages } from '@/i18n/messages/es';
import { es } from '@/i18n/messages/es';

export type VerificationLevel = 'unverified' | 'verified' | 'official';

interface VerificationBadgeProps {
  level: VerificationLevel;
  t?: Messages['verification_badge'];
  className?: string;
}

const VARIANT_MAP: Record<
  VerificationLevel,
  { variant: 'verification-official' | 'verification-verified' | 'unverified'; icon: string }
> = {
  official: { variant: 'verification-official', icon: '🏛️' },
  verified: { variant: 'verification-verified', icon: '🟢' },
  unverified: { variant: 'unverified', icon: '🔵' },
};

const LABEL_KEY: Record<VerificationLevel, keyof Messages['verification_badge']> = {
  official: 'official',
  verified: 'verified',
  unverified: 'unverified',
};

/**
 * VerificationBadge — visual indicator for resource trust level.
 *
 * Renders as a <span> so it can be used inline inside flex rows.
 * Accessible: aria-label describes both the type and value.
 * `t` is optional — falls back to Spanish when omitted (used in coordinator pages).
 */
export function VerificationBadge({
  level,
  t = es.verification_badge,
  className,
}: VerificationBadgeProps) {
  const { variant, icon } = VARIANT_MAP[level];
  const label = t[LABEL_KEY[level]] as string;
  return (
    <Badge
      variant={variant}
      aria-label={`${t.aria_prefix} ${label}`}
      className={className}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </Badge>
  );
}
