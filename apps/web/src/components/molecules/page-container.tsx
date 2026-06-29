import type { ReactNode } from 'react';

// One shared width for every page, so the whole app lines up.
export const PAGE_WIDTH_CLASS = 'mx-auto w-full max-w-3xl';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div
      className={`${PAGE_WIDTH_CLASS} flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
