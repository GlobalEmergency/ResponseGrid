import type { InputHTMLAttributes } from 'react';

const INPUT_CLASS =
  'w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Extra class names merged on top of the base style. */
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return <input {...props} className={`${INPUT_CLASS} ${className}`.trim()} />;
}
