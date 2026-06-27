type ReunificationStatus = 'open' | 'under_review' | 'matched' | 'closed';

interface ReunificationStatusBadgeProps {
  status: string;
}

const STATUS_LABELS: Record<ReunificationStatus, string> = {
  open: 'Abierto',
  under_review: 'En revisión',
  matched: 'Encontrado',
  closed: 'Cerrado',
};

const STATUS_CLASSES: Record<ReunificationStatus, string> = {
  open: 'border-blue-400 bg-blue-50 text-blue-800',
  under_review: 'border-amber-400 bg-amber-50 text-amber-800',
  matched: 'border-green-400 bg-green-50 text-green-800',
  closed: 'border-gray-300 bg-gray-100 text-gray-500',
};

const KNOWN_STATUSES: ReunificationStatus[] = [
  'open',
  'under_review',
  'matched',
  'closed',
];

function isReunificationStatus(s: string): s is ReunificationStatus {
  return KNOWN_STATUSES.includes(s as ReunificationStatus);
}

/**
 * ReunificationStatusBadge — Displays the status of a missing person report
 * with a color-coded badge.
 */
export function ReunificationStatusBadge({
  status,
}: ReunificationStatusBadgeProps) {
  const safeStatus = isReunificationStatus(status) ? status : 'closed';
  const label = STATUS_LABELS[safeStatus];
  const classes = STATUS_CLASSES[safeStatus];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}
