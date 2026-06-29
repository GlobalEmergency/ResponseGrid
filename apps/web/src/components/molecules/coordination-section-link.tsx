import Link from 'next/link';

interface CoordinationSectionLinkProps {
  href: string;
  label: string;
  description?: string;
  /** Pending count shown as a pill; omit for sections without a counter. */
  count?: number;
  /** Accessible suffix for the count, e.g. "pendientes". */
  countAria?: string;
}

export function CoordinationSectionLink({
  href,
  label,
  description,
  count,
  countAria,
}: CoordinationSectionLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border-2 border-navy bg-white px-5 py-4 transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-ink">{label}</span>
        {description != null && description !== '' && (
          <span className="text-sm text-muted">{description}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {count !== undefined && (
          <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-sm font-bold tabular-nums text-navy">
            {count}
            {countAria != null && <span className="sr-only"> {countAria}</span>}
          </span>
        )}
        <span aria-hidden="true" className="text-lg text-navy">
          →
        </span>
      </span>
    </Link>
  );
}
