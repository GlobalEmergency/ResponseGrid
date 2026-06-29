interface StatusCodeBadgeProps {
  code: number;
}

export function StatusCodeBadge({ code }: StatusCodeBadgeProps) {
  let classes: string;

  if (code >= 200 && code < 300) {
    classes =
      'inline-flex items-center rounded-full border border-success bg-success-soft px-2 py-0.5 text-xs font-semibold text-success';
  } else if (code >= 300 && code < 400) {
    classes =
      'inline-flex items-center rounded-full border border-info-line bg-info-soft px-2 py-0.5 text-xs font-semibold text-info';
  } else if (code >= 400 && code < 500) {
    classes =
      'inline-flex items-center rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning';
  } else {
    classes =
      'inline-flex items-center rounded-full border border-danger bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger';
  }

  return <span className={classes}>{code}</span>;
}
