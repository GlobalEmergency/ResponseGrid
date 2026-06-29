import type { ReactNode } from 'react';

interface DetailFieldProps {
  label: string;
  /** When null/undefined/empty the row is omitted entirely. */
  value?: ReactNode;
}

export function DetailField({ label, value }: DetailFieldProps) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-sm text-ink break-words">{value}</dd>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="border-t border-line first:border-t-0">
      <h3 className="pt-4 pb-1 text-sm font-bold text-ink">{title}</h3>
      <dl className="divide-y divide-line/60">{children}</dl>
    </section>
  );
}
