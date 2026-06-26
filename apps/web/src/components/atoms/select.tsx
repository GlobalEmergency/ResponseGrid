import type { SelectHTMLAttributes } from 'react';

const SELECT_CLASS =
  'w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className = '', ...props }: SelectProps) {
  return (
    <select {...props} className={`${SELECT_CLASS} ${className}`.trim()} />
  );
}
