'use client';

import { useActionState } from 'react';
import { validateNeed } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type NeedView = components['schemas']['NeedViewDto'];
type ItemCategory = components['schemas']['NeedItemResponseDto']['category'];

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface CoordinationNeedCardProps {
  need: NeedView;
  slug: string;
}

export function CoordinationNeedCard({
  need,
  slug,
}: CoordinationNeedCardProps) {
  const tc = getMessages(useLocale()).coord;

  const CATEGORY_LABELS: Record<ItemCategory, string> = {
    hygiene: tc.category_hygiene,
    water: tc.category_water,
    food: tc.category_food,
    medical: tc.category_medical,
    shelter: tc.category_shelter,
    tools: tc.category_tools,
    other: tc.category_other,
    medicines: tc.category_medicines,
    medical_equipment: tc.category_medical_equipment,
    medical_supplies: tc.category_medical_supplies,
    medical_personnel: tc.category_medical_personnel,
  };

  const PRIORITY_LABELS: Record<NeedView['priority'], string> = {
    low: tc.priority_low,
    medium: tc.priority_medium,
    high: tc.priority_high,
    urgent: tc.priority_urgent,
  };

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => {
      return validateNeed(need.id, slug);
    },
    INITIAL_STATE,
  );

  if (state.status === 'success') {
    return null;
  }

  return (
    <article
      aria-label={tc.need_card_label.replace('{title}', need.title)}
      className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-ink leading-tight break-words">
          {need.title}
        </h2>
        <FreshnessIndicator
          expiresAt={need.expiresAt}
          lastVerifiedAt={need.lastVerifiedAt}
        />
        <div className="flex flex-wrap gap-3 text-sm text-muted">
          {need.items[0] !== undefined && (
            <span className="font-medium">
              {CATEGORY_LABELS[need.items[0].category]}
            </span>
          )}
          <span aria-hidden="true" className="text-muted-soft">·</span>
          <span>{tc.priority_label}: {PRIORITY_LABELS[need.priority]}</span>
          {need.items.length > 0 && (
            <>
              <span aria-hidden="true" className="text-muted-soft">·</span>
              <span>
                {String(need.items[0]?.quantity ?? '')}
                {need.items[0]?.unit != null
                  ? ` ${String(need.items[0].unit)}`
                  : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? tc.error_unknown} />
      )}

      {/* Validate form */}
      <form action={formAction}>
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? tc.processing : tc.need_validate}
        </Button>
      </form>
    </article>
  );
}
