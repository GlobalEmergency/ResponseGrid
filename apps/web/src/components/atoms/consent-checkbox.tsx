'use client';

import type { InputHTMLAttributes } from 'react';

interface ConsentCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  id: string;
  name: string;
}

export function ConsentCheckbox({
  label,
  id,
  name,
  className = '',
  ...props
}: ConsentCheckboxProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`.trim()}>
      <input
        {...props}
        id={id}
        name={name}
        type="checkbox"
        required
        className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-2 border-navy accent-navy"
      />
      <label
        htmlFor={id}
        className="text-sm text-ink-soft leading-snug cursor-pointer"
      >
        {label}{' '}
        <span aria-hidden="true" className="text-danger font-bold">
          *
        </span>
      </label>
    </div>
  );
}
