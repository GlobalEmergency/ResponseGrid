import type { SelectHTMLAttributes } from 'react';

const SELECT_CLASS =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className = '', ...props }: SelectProps) {
  return (
    <select {...props} className={`${SELECT_CLASS} ${className}`.trim()} />
  );
}
