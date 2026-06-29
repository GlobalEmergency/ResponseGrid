'use client';

import { useTransition } from 'react';
import { removeMemberAction } from '../actions';
import { Button } from '@/components/atoms/button';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface RemoveMemberButtonProps {
  orgId: string;
  userId: string;
}

export function RemoveMemberButton({ orgId, userId }: RemoveMemberButtonProps) {
  const td = getMessages(useLocale()).org_detail;
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
      aria-label={td.remove_label}
    >
      {pending ? td.removing : td.remove_submit}
    </Button>
  );
}
