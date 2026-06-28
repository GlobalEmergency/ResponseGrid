'use client';

import { useActionState } from 'react';
import { renewNeed } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { categoryLabel } from '@/lib/categories';
import { LocalDate } from '@/components/atoms/local-date';

type NeedView = components['schemas']['NeedViewDto'];

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface ExpiredNeedCardProps {
  need: NeedView;
  slug: string;
}

export function ExpiredNeedCard({ need, slug }: ExpiredNeedCardProps) {
  const locale = useLocale();
  const tc = getMessages(locale).coord;

  const PRIORITY_LABELS: Record<NeedView['priority'], string> = {
    low: tc.priority_low,
    medium: tc.priority_medium,
    high: tc.priority_high,
    urgent: tc.priority_urgent,
  };

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => {
      return renewNeed(need.id, slug);
    },
    INITIAL_STATE,
  );

  if (state.status === 'success') {
    return null;
  }

  return (
    <article
      aria-label={tc.expired_card_label.replace('{title}', need.title)}
      className="flex flex-col gap-4 rounded-lg border-2 border-line bg-surface p-5 opacity-75"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-ink-soft leading-tight break-words">
          {need.title}
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-muted">
          {need.items[0] !== undefined && (
            <span className="font-medium">
              {categoryLabel(need.items[0].category, locale)}
            </span>
          )}
          <span aria-hidden="true" className="text-muted-soft">·</span>
          <span>{tc.priority_label}: {PRIORITY_LABELS[need.priority]}</span>
          {need.expiresAt != null && (
            <>
              <span aria-hidden="true" className="text-muted-soft">·</span>
              <span>
                {tc.expired_at_label}:{' '}
                <LocalDate iso={need.expiresAt} withTime />
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? tc.error_unknown} />
      )}

      {/* Renew form */}
      <form action={formAction}>
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? tc.expired_renewing : tc.expired_renew}
        </Button>
      </form>
    </article>
  );
}
