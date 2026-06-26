import type { LabelHTMLAttributes } from 'react';

const LABEL_CLASS = 'text-sm font-semibold text-gray-900';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      {...props}
      className={`${LABEL_CLASS} ${className}`.trim()}
    >
      {children}
    </label>
  );
}
