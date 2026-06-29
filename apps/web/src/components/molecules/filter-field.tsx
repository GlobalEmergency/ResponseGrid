import type { ReactNode } from 'react';

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
