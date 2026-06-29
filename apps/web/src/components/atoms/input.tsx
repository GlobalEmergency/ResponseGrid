import type { InputHTMLAttributes, ReactNode } from 'react';

// Padding is split out so a leading icon can swap `px-4` for `pl-10 pr-4`
// without two conflicting padding utilities ending up on the same element.
const INPUT_BASE =
  'w-full rounded-lg border border-line bg-white py-3 text-base text-ink placeholder:text-muted-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  icon?: ReactNode;
}

export function Input({ className = '', icon, ...props }: InputProps) {
  const padding = icon ? 'pl-10 pr-4' : 'px-4';
  const input = (
    <input {...props} className={`${INPUT_BASE} ${padding} ${className}`.trim()} />
  );

  if (icon === undefined) return input;

  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft">
        {icon}
      </span>
      {input}
    </span>
  );
}
