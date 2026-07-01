import Link from 'next/link';

export interface ContextSwitcherItem {
  label: string;
  /** Omit for the current/last item — rendered unlinked. */
  href?: string;
}

interface ContextSwitcherProps {
  items: ContextSwitcherItem[];
}

/**
 * Breadcrumb-style context switcher: `Inicio › {emergencia} › {sección}`.
 * Every item but the last links out; the last renders as plain text (current
 * location). Presentational only — callers resolve labels/hrefs.
 */
export function ContextSwitcher({ items }: ContextSwitcherProps) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted">
                &rsaquo;
              </span>
            )}
            {isLast || item.href == null ? (
              <span className="font-semibold text-ink">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
