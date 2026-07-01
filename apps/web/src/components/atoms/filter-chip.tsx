import Link from 'next/link';

interface FilterChipProps {
  href: string;
  label: string;
  /** Optional trailing count, e.g. facet size. */
  count?: number;
  active?: boolean;
}

/**
 * Reusable filter pill for sections whose filter is a small enumerated set
 * (status, category, …). Renders as a link so the filter state lives in the
 * URL (server-rendered, shareable, back/forward-friendly) rather than client
 * state — the caller builds `href` with the right search params.
 */
export function FilterChip({ href, label, count, active = false }: FilterChipProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1';
  const tone = active
    ? 'bg-navy text-white'
    : 'bg-white border border-line text-ink hover:bg-surface';

  return (
    <Link href={href} className={`${base} ${tone}`} aria-current={active ? 'true' : undefined}>
      {label}
      {count !== undefined && (
        <span className={active ? 'text-on-navy' : 'text-muted'}>{count}</span>
      )}
    </Link>
  );
}
