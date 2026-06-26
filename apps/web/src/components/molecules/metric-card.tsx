interface MetricCardProps {
  value: number | string;
  label: string;
}

/**
 * MetricCard — a single metric tile (big number + descriptive label).
 * Used in the 2×2 / 4-column metrics grid on the emergency public page.
 */
export function MetricCard({ value, label }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-5">
      <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
        {value}
      </span>
      <span className="mt-1 text-xs font-medium text-gray-500 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
