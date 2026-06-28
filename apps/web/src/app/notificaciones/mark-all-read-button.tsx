'use client';

import { useTransition } from 'react';
import { markAllNotificationsReadAction } from './actions';
import { Button } from '@/components/atoms/button';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface MarkAllReadButtonProps {
  hasUnread: boolean;
}

/**
 * MarkAllReadButton — client component that calls the markAllNotificationsRead
 * server action and shows a pending state while the request is in-flight.
 */
export function MarkAllReadButton({ hasUnread }: MarkAllReadButtonProps) {
  const tn = getMessages(useLocale()).notificaciones;
  const [isPending, startTransition] = useTransition();

  if (!hasUnread) return null;

  const handleClick = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-label={tn.mark_all_label}
    >
      {isPending ? tn.marking : tn.mark_all}
    </Button>
  );
}
