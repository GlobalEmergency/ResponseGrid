'use client';

import { useTransition } from 'react';
import { removeMemberAction } from '../actions';

interface RemoveMemberButtonProps {
  orgId: string;
  userId: string;
}

export function RemoveMemberButton({ orgId, userId }: RemoveMemberButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMemberAction(orgId, userId);
      if (result.status === 'error') {
        // Display inline — the page will revalidate on success
        alert(result.message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      aria-label="Quitar miembro"
      className="rounded-md border-2 border-red-600 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Quitando…' : 'Quitar'}
    </button>
  );
}
