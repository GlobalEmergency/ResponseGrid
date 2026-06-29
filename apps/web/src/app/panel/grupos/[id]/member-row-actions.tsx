'use client';

import { useState, useTransition } from 'react';
import { approveMemberAction, assignManagerAction } from '../actions';
import { Button } from '@/components/atoms/button';

interface Props {
  groupId: string;
  userId: string;
  status: string;
}

export function MemberRowActions({ groupId, userId, status }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ status: string; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === 'error') {
        setError(result.message ?? 'Error');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === 'pending' && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => approveMemberAction(groupId, userId))}
          >
            {pending ? '…' : 'Aprobar'}
          </Button>
        )}
        {status === 'approved' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => assignManagerAction(groupId, userId))}
          >
            {pending ? '…' : 'Hacer manager'}
          </Button>
        )}
      </div>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
