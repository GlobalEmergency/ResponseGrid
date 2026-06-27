/**
 * RelativeTime — server-safe last-updated display.
 *
 * Renders an absolute "DD MMM, HH:MM" string (e.g. "26 jun, 14:32") to avoid
 * server/client hydration mismatches that would occur with Date.now()-based
 * relative strings.  The machine-readable ISO string is preserved in the
 * <time dateTime> attribute for programmatic consumers.
 */

interface RelativeTimeProps {
  /** ISO 8601 timestamp string */
  isoString: string;
  /** Optional CSS classes */
  className?: string;
}

function formatAbsolute(isoString: string): string {
  const date = new Date(isoString);

  // Guard against invalid dates
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function RelativeTime({ isoString, className }: RelativeTimeProps) {
  const formatted = formatAbsolute(isoString);

  return (
    <time
      dateTime={isoString}
      className={className}
      suppressHydrationWarning
    >
      {formatted}
    </time>
  );
}
