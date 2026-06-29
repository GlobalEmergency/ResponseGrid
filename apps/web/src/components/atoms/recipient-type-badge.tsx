interface RecipientTypeBadgeProps {
  label: string;
  colorClass: string;
  ariaLabel: string;
}

export function RecipientTypeBadge({
  label,
  colorClass,
  ariaLabel,
}: RecipientTypeBadgeProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}
