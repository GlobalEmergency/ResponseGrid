type Tone = 'navy' | 'success' | 'accent';

interface MetricCardProps {
  value: number | string;
  label: string;
  /** Colour of the figure. Defaults to navy. */
  tone?: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  navy: 'text-navy',
  success: 'text-success',
  accent: 'text-accent',
};

/**
 * MetricCard — a single metric tile (big figure + label) for the emergency
 * summary grid. Branded "Banda oficial" look: warm card, Archivo figure.
 */
export function MetricCard({ value, label, tone = 'navy' }: MetricCardProps) {
  return (
    <div className="rounded-card border border-line bg-white px-3.5 py-3">
      <span
        className={`block font-display text-[26px] font-extrabold leading-none tabular-nums ${TONE_CLASS[tone]}`}
      >
        {value}
      </span>
      <span className="mt-1.5 block text-xs leading-tight text-muted">{label}</span>
    </div>
  );
}
