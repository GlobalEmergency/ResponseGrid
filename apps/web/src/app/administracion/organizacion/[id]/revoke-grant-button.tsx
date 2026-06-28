'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { revokeOrgGrantAction } from './actions';

export function RevokeGrantButton({
  grantId,
  orgId,
}: {
  grantId: string;
  orgId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeOrgGrantAction(grantId, orgId);
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
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
