import type { ReactNode } from 'react';

interface QueueToolbarProps {
  children: ReactNode;
}

/**
 * Pure layout container for a section's search + filter controls above a
 * {@link WorkQueue}. Stacks on mobile, flows into a wrapping row from `sm`
 * up — it does not know what the controls are, only how to lay them out.
 */
export function QueueToolbar({ children }: QueueToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}
