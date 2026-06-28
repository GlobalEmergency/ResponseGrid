'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger-outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const BASE =
  'flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary: 'text-white bg-navy border border-navy hover:bg-navy-700',
  secondary:
    'text-navy bg-white border border-navy hover:bg-surface',
  'danger-outline':
    'text-danger border border-danger hover:bg-danger-soft focus:ring-danger',
};

const SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  size = 'lg',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
