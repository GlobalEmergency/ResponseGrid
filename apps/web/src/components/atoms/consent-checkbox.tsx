'use client';

import type { InputHTMLAttributes } from 'react';

interface ConsentCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Legal text shown next to the checkbox. */
  label: string;
  id: string;
  name: string;
}

/**
 * ConsentCheckbox — Blocking checkbox with legal text.
 * Renders a styled checkbox with accessible label. Form submission is
 * blocked unless this is checked (required attribute + form validation).
 */
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
        className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-2 border-gray-900 accent-gray-900"
      />
      <label
        htmlFor={id}
        className="text-sm text-gray-700 leading-snug cursor-pointer"
      >
        {label}{' '}
        <span aria-hidden="true" className="text-red-600 font-bold">
          *
        </span>
      </label>
    </div>
  );
}
