import type { ReactNode } from 'react';

/**
 * FilterField — a labelled form control for the filter bars. Keeps every field
 * (selects, search) visually identical: full width, label above, consistent
 * spacing. Wrapping in <label> means the caption also focuses the control.
 */
interface FilterFieldProps {
  label: string;
  children: ReactNode;
}

export function FilterField({ label, children }: FilterFieldProps) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}
