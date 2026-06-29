'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { revokeGrantAction, type ScopeType } from './actions';

export function RevokeGrantButton({
  grantId,
  scopeType,
  scopeId,
}: {
  grantId: string;
  scopeType: ScopeType;
  scopeId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeGrantAction(grantId, scopeType, scopeId);
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
