/**
 * AnnouncementCard — displays the official coordinator announcement alongside
 * the last-updated timestamp.  Renders nothing when announcement is null.
 * `t` is optional — falls back to Spanish when omitted.
 */

import { RelativeTime } from '@/components/atoms/relative-time';
import type { Messages } from '@/i18n/messages/es';
import { es } from '@/i18n/messages/es';

interface AnnouncementCardProps {
  announcement: string | null;
  updatedAt: string;
  t?: Messages['announcement'];
}

export function AnnouncementCard({
  announcement,
  updatedAt,
  t = es.announcement,
}: AnnouncementCardProps) {
  if (announcement === null) {
    return (
      <p className="text-xs text-gray-400">
        {t.last_updated}{' '}
        <RelativeTime isoString={updatedAt} />
      </p>
    );
  }

  return (
    <aside
      aria-label={t.aria_label}
      className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-gray-50 px-5 py-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t.official_label}
      </p>
      <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
        {announcement}
      </p>
      <p className="text-xs text-gray-400">
        {t.last_updated}{' '}
        <RelativeTime isoString={updatedAt} />
      </p>
    </aside>
  );
}
