/**
 * RecipientTypeBadge — pill shown on a resource that is a "final recipient"
 * of aid (#60), displaying its localised recipient type. Colour comes from
 * `lib/recipient-types`; degrades gracefully for unknown/custom types.
 */
interface RecipientTypeBadgeProps {
  /** Localised type label, e.g. "Hospital" (or the raw slug if unknown). */
  label: string;
  /** Tailwind colour classes from recipientTypeColor(). */
  colorClass: string;
  /** Full aria label, e.g. "Destinatario final: Hospital". */
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
