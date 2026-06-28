'use client';

import { useTransition } from 'react';
import { revokeAccreditationAction } from './actions';
import { Button } from '@/components/atoms/button';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface RevokeButtonProps {
  accreditationId: string;
}

export function RevokeButton({ accreditationId }: RevokeButtonProps) {
  const ta = getMessages(useLocale()).admin;
  const [pending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      await revokeAccreditationAction(accreditationId);
    });
  }

  return (
    <Button
      type="button"
      variant="danger-outline"
      size="sm"
      disabled={pending}
      onClick={handleRevoke}
    >
      {pending ? ta.acc_revoking : ta.acc_revoke}
    </Button>
  );
}
