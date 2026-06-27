interface StatusCodeBadgeProps {
  code: number;
}

/**
 * StatusCodeBadge — coloured pill for HTTP status codes.
 * Green  for 2xx, amber for 3xx, red for 4xx/5xx.
 */
export function StatusCodeBadge({ code }: StatusCodeBadgeProps) {
  let classes: string;

  if (code >= 200 && code < 300) {
    classes =
      'inline-flex items-center rounded-full border border-green-400 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800';
  } else if (code >= 300 && code < 400) {
    classes =
      'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700';
  } else if (code >= 400 && code < 500) {
    classes =
      'inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800';
  } else {
    classes =
      'inline-flex items-center rounded-full border border-red-400 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800';
  }

  return <span className={classes}>{code}</span>;
}
