import type { InputHTMLAttributes } from 'react';

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Extra class names merged on top of the base style. */
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return <input {...props} className={`${INPUT_CLASS} ${className}`.trim()} />;
}
