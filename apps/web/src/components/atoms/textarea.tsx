import type { TextareaHTMLAttributes } from 'react';

const TEXTAREA_CLASS =
  'w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 resize-none';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea {...props} className={`${TEXTAREA_CLASS} ${className}`.trim()} />
  );
}
