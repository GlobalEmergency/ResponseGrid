'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { markNotificationReadAction } from '@/app/panel/notificaciones/actions';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { LocalDate } from '@/components/atoms/local-date';

export interface NotificationItemProps {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  link: string | null;
}

/**
 * NotificationItem — molecule displaying a single in-app notification.
 *
 * - Unread notifications have a blue dot indicator and bold message text.
 * - If the notification has a `link`, the item wraps its content in a Next.js
 *   Link and marks itself read on click.
 * - When `link` is null, clicking "Marcar leída" fires the server action
 *   directly via a form button.
 */
export function NotificationItem({
  id,
  message,
  createdAt,
  read,
  link,
}: NotificationItemProps) {
  const locale = useLocale();
  const tn = getMessages(locale).notificaciones;
  const [isPending, startTransition] = useTransition();

  const handleMarkRead = () => {
    startTransition(async () => {
      await markNotificationReadAction(id);
    });
  };

  const innerContent = (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <p
        className={`text-sm leading-snug break-words ${read ? 'text-muted font-normal' : 'text-ink font-semibold'}`}
      >
        {message}
      </p>
      <LocalDate
        iso={createdAt}
        withTime
        className="text-xs text-muted-soft"
      />
    </div>
  );

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
        read
          ? 'border-line bg-white'
          : 'border-navy bg-white'
      }`}
      aria-label={read ? `${tn.item_read_aria}: ${message}` : `${tn.item_unread_aria}: ${message}`}
    >
      {/* Unread indicator dot */}
      <span
        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
          read ? 'bg-transparent' : 'bg-info-dot'
        }`}
        aria-hidden="true"
      />

      {link != null ? (
        <Link
          href={link}
          onClick={read ? undefined : handleMarkRead}
          className="flex-1 min-w-0 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded transition-opacity"
        >
          {innerContent}
        </Link>
      ) : (
        innerContent
      )}

      {/* Mark read button — only shown for unread notifications without a link
          (linked notifications mark themselves read on click) */}
      {!read && link === null && (
        <button
          type="button"
          onClick={handleMarkRead}
          disabled={isPending}
          aria-label={tn.mark_read_label}
          className="flex-shrink-0 text-xs font-medium text-muted underline underline-offset-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? tn.marking : tn.mark_read}
        </button>
      )}
    </li>
  );
}
