import type { TextareaHTMLAttributes } from 'react';

const TEXTAREA_CLASS =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea {...props} className={`${TEXTAREA_CLASS} ${className}`.trim()} />
  );
}
