import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/atoms/section-heading';

interface WorkQueueProps {
  title: string;
  subtitle?: string;
  /** Search/filter controls, typically a {@link QueueToolbar}. */
  toolbar?: ReactNode;
  /** The queue itself (a *Queue organism, e.g. ResourcesQueue). */
  children: ReactNode;
  /** Pagination control rendered below the queue. */
  pagination?: ReactNode;
  headingId?: string;
}

/**
 * Consistent section layout for the emergency workspace: heading (+ optional
 * muted subtitle), a toolbar slot for search/filters, the queue content, and
 * a pagination slot. Every `manage/<section>` page composes its own data
 * fetch + queue organism and wraps them in this shell so sections look and
 * behave the same.
 */
export function WorkQueue({
  title,
  subtitle,
  toolbar,
  children,
  pagination,
  headingId = 'work-queue-heading',
}: WorkQueueProps) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <SectionHeading as="h2" size="lg" id={headingId}>
          {title}
        </SectionHeading>
        {subtitle !== undefined && <p className="text-sm text-muted">{subtitle}</p>}
      </div>

      {toolbar !== undefined && toolbar}

      {children}

      {pagination !== undefined && pagination}
    </section>
  );
}
