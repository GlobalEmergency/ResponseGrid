import type { HTMLAttributes } from 'react';

interface TrappedPersonsCountProps extends HTMLAttributes<HTMLSpanElement> {
  count: number | null | undefined;
}

/**
 * Displays the estimated number of trapped persons.
 * Shows "?" when the estimate is null, undefined, or 0 (unknown).
 */
export function TrappedPersonsCount({ count, className = '', ...props }: TrappedPersonsCountProps) {
  const display = count != null && count > 0 ? String(count) : '?';

  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1 text-sm font-semibold text-gray-900 ${className}`.trim()}
    >
      {/* Person silhouette icon (Unicode) */}
      <span aria-hidden="true" className="text-base">🧍</span>
      <span>
        {display}
        <span className="sr-only"> personas atrapadas estimadas</span>
      </span>
    </span>
  );
}
