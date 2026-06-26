'use client';

import { useTransition } from 'react';
import { removeMemberAction } from '../actions';
import { Button } from '@/components/atoms/button';

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
    <Button
      type="button"
      variant="danger-outline"
      size="sm"
      onClick={handleRemove}
      disabled={pending}
      aria-label="Quitar miembro"
    >
      {pending ? 'Quitando…' : 'Quitar'}
    </Button>
  );
}
