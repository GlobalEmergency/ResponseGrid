/**
 * HowItWorksStep — a numbered step in the Home "Cómo funciona" section.
 */
interface HowItWorksStepProps {
  index: number;
  title: string;
  body: string;
  /** Step accent — the final step uses the accent colour. */
  tone?: 'navy' | 'accent';
}

export function HowItWorksStep({ index, title, body, tone = 'navy' }: HowItWorksStepProps) {
  return (
    <div className="flex gap-3.5">
      <span
        className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full font-display text-[15px] font-extrabold text-white ${tone === 'accent' ? 'bg-accent' : 'bg-navy'}`}
        aria-hidden="true"
      >
        {index}
      </span>
      <div>
        <div className="text-[15px] font-bold text-ink">{title}</div>
        <div className="mt-0.5 text-[13px] leading-[1.45] text-muted">{body}</div>
      </div>
    </div>
  );
}
