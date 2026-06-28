'use client';

/**
 * Discrete notice shown when a form draft has been restored from localStorage.
 * Atom — no interactivity; purely informational.
 */
export function DraftRestoredBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-muted"
    >
      Borrador restaurado
    </div>
  );
}
