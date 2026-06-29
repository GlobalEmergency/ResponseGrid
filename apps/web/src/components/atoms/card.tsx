import type { ElementType, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children?: ReactNode;
}

export function Card({ as: As = 'div', className = '', children, ...props }: CardProps) {
  return (
    <As className={`rounded-card border border-line bg-white ${className}`.trim()} {...props}>
      {children}
    </As>
  );
}
