'use client';

import { useState, useTransition } from 'react';
import { revokeServiceAccountGrantAction } from './actions';
import { Button } from '@/components/atoms/button';

export function RevokeServiceAccountGrantButton({
  grantId,
  serviceAccountId,
}: {
  grantId: string;
  serviceAccountId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeServiceAccountGrantAction(
        grantId,
        serviceAccountId,
      );
      if (result.status === 'error') setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger-outline"
        size="sm"
        disabled={pending}
        onClick={handleRevoke}
      >
        {pending ? 'Revocando…' : 'Revocar'}
      </Button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
