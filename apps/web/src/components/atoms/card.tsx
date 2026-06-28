import type { ElementType, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Element to render (div by default; e.g. 'article', 'aside', 'section'). */
  as?: ElementType;
  children?: ReactNode;
}

/**
 * Card — the brand surface primitive: warm 1px border, card radius, white fill.
 * Compose padding/layout via `className`; pick the element via `as`.
 */
export function Card({ as: As = 'div', className = '', children, ...props }: CardProps) {
  return (
    <As className={`rounded-card border border-line bg-white ${className}`.trim()} {...props}>
      {children}
    </As>
  );
}
