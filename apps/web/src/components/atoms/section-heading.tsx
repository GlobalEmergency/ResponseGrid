import type { ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl lg:text-2xl',
};

interface SectionHeadingProps {
  children: ReactNode;
  as?: 'h2' | 'h3';
  size?: Size;
  id?: string;
  className?: string;
}

export function SectionHeading({
  children,
  as: As = 'h2',
  size = 'md',
  id,
  className = '',
}: SectionHeadingProps) {
  return (
    <As id={id} className={`font-display font-bold text-navy ${SIZE_CLASS[size]} ${className}`.trim()}>
      {children}
    </As>
  );
}
