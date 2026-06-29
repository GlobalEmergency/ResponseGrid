import { Card } from '@/components/atoms/card';
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
      <p className="text-xs text-muted-soft">
        {t.last_updated}{' '}
        <RelativeTime isoString={updatedAt} />
      </p>
    );
  }

  return (
    <Card as="aside" aria-label={t.aria_label} className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy">
          {t.official_label}
        </span>
        <span className="text-[11px] text-muted-soft">{t.source}</span>
      </div>
      <p className="text-[14.5px] leading-relaxed text-ink-soft whitespace-pre-wrap">
        {announcement}
      </p>
      <p className="text-xs text-muted-soft">
        {t.last_updated}{' '}
        <RelativeTime isoString={updatedAt} />
      </p>
    </Card>
  );
}
