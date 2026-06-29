'use client';

// Kept as a named component so existing call sites (`isoString` prop) are
// unchanged.
import { LocalDate } from '@/components/atoms/local-date';

interface RelativeTimeProps {
  isoString: string;
  className?: string;
}

export function RelativeTime({ isoString, className }: RelativeTimeProps) {
  return <LocalDate iso={isoString} withTime className={className} />;
}
