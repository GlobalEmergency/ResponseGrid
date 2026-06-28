'use client';

import { useState, useTransition } from 'react';
import { requestToJoinAction } from '../actions';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

export function JoinButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleJoin() {
    setMessage(null);
    startTransition(async () => {
      const result = await requestToJoinAction(groupId);
      if (result.status === 'error') setMessage(result.message);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <p
        role="status"
        className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
      >
        Solicitud enviada. Un manager la revisará.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message && <ErrorMessage message={message} />}
      <Button type="button" onClick={handleJoin} disabled={pending} size="md">
        {pending ? 'Enviando…' : 'Solicitar unirme'}
      </Button>
    </div>
  );
}
