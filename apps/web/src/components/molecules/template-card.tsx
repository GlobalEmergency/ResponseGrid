import type { ReactNode } from 'react';
import { formatDate } from '@/lib/format-date';
import { getT } from '@/i18n/server';

interface TemplateCardProps {
  name: string;
  description: string;
  dontBringCount: number;
  createdAt: string;
  actions?: ReactNode;
}

/**
 * TemplateCard — displays a summary of an emergency template.
 * Actions slot accepts delete/edit controls (optional). Server component.
 */
export async function TemplateCard({
  name,
  description,
  dontBringCount,
  createdAt,
  actions,
}: TemplateCardProps) {
  const { t, locale } = await getT();
  return (
    <article className="flex items-start justify-between gap-4 rounded-lg border-2 border-navy bg-white p-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-sm font-bold text-ink break-words">{name}</h3>
        <p className="text-xs text-muted break-words">{description}</p>
        <p className="text-xs text-muted-soft">
          {t.ui.template_dont_bring_items.replace('{count}', String(dontBringCount))} · {t.ui.created}{' '}
          <time dateTime={createdAt} suppressHydrationWarning>
            {formatDate(createdAt, locale)}
          </time>
        </p>
      </div>
      {actions != null && (
        <div className="flex-shrink-0">{actions}</div>
      )}
    </article>
  );
}
