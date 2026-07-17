'use client';

import { useState, useTransition } from 'react';
import { issueApiKeyAction } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

export function IssueKeyButton({
  serviceAccountId,
}: {
  serviceAccountId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState('');

  function handleIssue() {
    setError(null);
    setSecret(null);
    startTransition(async () => {
      const result = await issueApiKeyAction(serviceAccountId, expiresAt);
      if (result.status === 'success') {
        setSecret(result.apiKey);
        setExpiresAt('');
      } else if (result.status === 'error') setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorMessage message={error} />}

      {secret ? (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            Copia esta clave ahora — no se volverá a mostrar.
          </p>
          <code className="block w-full overflow-x-auto rounded bg-white px-3 py-2 font-mono text-sm text-ink select-all break-all">
            {secret}
          </code>
          <button
            type="button"
            onClick={() => setSecret(null)}
            className="self-start text-xs font-medium text-amber-800 underline"
          >
            Ya la he guardado, ocultar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:max-w-xs">
          <FormField htmlFor="key-expiresAt" label="Caduca (opcional)">
            <Input
              id="key-expiresAt"
              name="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              autoComplete="off"
            />
          </FormField>
          <Button
            type="button"
            onClick={handleIssue}
            disabled={pending}
            size="md"
          >
            {pending ? 'Emitiendo…' : 'Emitir nueva clave'}
          </Button>
        </div>
      )}
    </div>
  );
}
