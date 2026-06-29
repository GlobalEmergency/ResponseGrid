import Link from 'next/link';

// Prev/next links preserve the current filter params and only set `page` when
// it is > 1, keeping page-1 URLs clean.
interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  /** Other query params to keep on every page link (filters/search). */
  preserve?: Record<string, string>;
  labels: {
    prev: string;
    next: string;
    /** Template: "Página {page} de {pages} · {total} resultados". */
    summary: string;
  };
}

export function Pagination({
  page,
  limit,
  total,
  preserve = {},
  labels,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));

  function href(target: number): string {
    const params = new URLSearchParams(preserve);
    if (target > 1) params.set('page', String(target));
    const qs = params.toString();
    return qs === '' ? '?' : `?${qs}`;
  }

  const summary = labels.summary
    .replace('{page}', String(page))
    .replace('{pages}', String(pages))
    .replace('{total}', String(total));

  const linkBase =
    'rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1';
  const enabled = 'border-navy text-ink hover:bg-surface';
  const disabled = 'pointer-events-none border-line text-muted-soft';

  return (
    <nav
      className="flex flex-col items-center gap-3 pt-2"
      aria-label={labels.summary.replace(/\s*·.*/, '')}
    >
      <p className="text-sm text-muted">{summary}</p>
      {pages > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={href(page - 1)} className={`${linkBase} ${enabled}`} rel="prev">
              ← {labels.prev}
            </Link>
          ) : (
            <span className={`${linkBase} ${disabled}`} aria-disabled="true">
              ← {labels.prev}
            </span>
          )}
          {page < pages ? (
            <Link href={href(page + 1)} className={`${linkBase} ${enabled}`} rel="next">
              {labels.next} →
            </Link>
          ) : (
            <span className={`${linkBase} ${disabled}`} aria-disabled="true">
              {labels.next} →
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
