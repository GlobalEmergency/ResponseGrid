import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Dense, clickable navigation row for the personal home. Design ban: no card
 * grids and no coloured side-stripes — rows live inside a single bordered
 * `ContextList` container, separated by hairlines. The whole row is one thumb
 * target (min-h ~56px): tinted icon · title (ink) + muted subtitle · trailing
 * chevron. Orange is never decorative here — only a caller-supplied action
 * `trailing` may carry it.
 */
interface ContextListRowProps {
  href: string;
  title: string;
  subtitle?: string;
  /** Left slot — usually a `ContextIcon`. */
  icon?: ReactNode;
  /** Right slot — defaults to a chevron. */
  trailing?: ReactNode;
}

function Chevron() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-muted"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ContextListRow({
  href,
  title,
  subtitle,
  icon,
  trailing,
}: ContextListRowProps) {
  return (
    <Link
      href={href}
      className="flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
    >
      {icon != null && icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{title}</span>
        {subtitle != null && subtitle !== '' && (
          <span className="truncate text-xs text-muted">{subtitle}</span>
        )}
      </span>
      {trailing ?? <Chevron />}
    </Link>
  );
}

/**
 * Container that wraps several `ContextListRow`s in one bordered card, drawing
 * the hairline between rows (mobile-first single column; `sm:grid-cols-2` when
 * a caller opts in). Keeps the "group = one border" rule in one place instead
 * of repeating it per section.
 */
interface ContextListProps {
  children: ReactNode;
  className?: string;
}

export function ContextList({ children, className = '' }: ContextListProps) {
  return (
    <div
      className={`divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white ${className}`.trim()}
    >
      {children}
    </div>
  );
}
