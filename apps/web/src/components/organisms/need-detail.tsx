'use client';

import { useActionState, useEffect } from 'react';
import {
  validateNeed,
  editNeed,
  discardNeed,
} from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FreshnessIndicator } from '@/components/atoms/freshness-indicator';
import { LocalDate } from '@/components/atoms/local-date';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import {
  ValidationActions,
  type EditField,
} from '@/components/organisms/validation-actions';
import { DetailField, DetailSection } from '@/components/molecules/detail-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { categoryLabel } from '@/lib/categories';

type NeedView = components['schemas']['NeedViewDto'];

const INITIAL_STATE: ActionResult = { status: 'idle' };

const PRIORITY_BADGE: Record<
  NeedView['priority'],
  'priority-urgent' | 'priority-high' | 'priority-medium' | 'priority-low'
> = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

interface NeedDetailProps {
  need: NeedView;
  slug: string;
  /** Whether the user may validate (gates the action button). */
  canValidate: boolean;
  open: boolean;
  onClose: () => void;
  /** Called after a successful validate so the parent drops the item. */
  onActionSuccess: () => void;
}

export function NeedDetail({
  need,
  slug,
  canValidate,
  open,
  onClose,
  onActionSuccess,
}: NeedDetailProps) {
  const locale = useLocale();
  const tc = getMessages(locale).coord;

  const PRIORITY_LABELS: Record<NeedView['priority'], string> = {
    low: tc.priority_low,
    medium: tc.priority_medium,
    high: tc.priority_high,
    urgent: tc.priority_urgent,
  };

  const STATUS_LABELS: Record<NeedView['status'], string> = {
    pending: tc.detail_status_pending,
    validated: tc.detail_status_validated,
    rejected: tc.detail_status_rejected,
    fulfilled: tc.detail_status_fulfilled,
  };

  const SKILL_LABELS: Record<string, string> = {
    driving: tc.skill_driving,
    medical: tc.skill_medical,
    logistics: tc.skill_logistics,
    cooking: tc.skill_cooking,
    languages: tc.skill_languages,
    admin: tc.skill_admin,
    general: tc.skill_general,
  };

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async () => validateNeed(need.id, slug),
    INITIAL_STATE,
  );

  // Notify the parent once the action succeeds (parent closes + drops the item).
  useEffect(() => {
    if (state.status === 'success') onActionSuccess();
  }, [state.status, onActionSuccess]);

  const coords = `${need.location.latitude}, ${need.location.longitude}`;
  const skill =
    need.requiredSkill != null
      ? (SKILL_LABELS[need.requiredSkill] ?? need.requiredSkill)
      : null;

  const editFields: EditField[] = [
    { key: 'title', label: tc.edit_field_title, kind: 'text', defaultValue: need.title },
    {
      key: 'description',
      label: tc.detail_field_description,
      kind: 'textarea',
      defaultValue: need.description ?? '',
    },
    {
      key: 'priority',
      label: tc.detail_field_priority,
      kind: 'select',
      defaultValue: need.priority,
      options: (
        ['urgent', 'high', 'medium', 'low'] as NeedView['priority'][]
      ).map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    },
  ];

  const footer = canValidate ? (
    <div className="flex flex-col gap-3">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? tc.error_unknown} />
      )}
      <form action={formAction}>
        <Button type="submit" disabled={pending} fullWidth size="lg">
          {pending ? tc.processing : tc.need_validate}
        </Button>
      </form>
      <ValidationActions
        canAct={canValidate}
        editFields={editFields}
        onEdit={(reason, values) =>
          editNeed(need.id, slug, {
            reason,
            title: values.title,
            description: values.description,
            priority: values.priority as NeedView['priority'],
          })
        }
        onDiscard={(reason) => discardNeed(need.id, slug, reason)}
        onActionSuccess={onActionSuccess}
      />
    </div>
  ) : undefined;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={need.title}
      ariaLabel={tc.drawer_open_need.replace('{title}', need.title)}
      titleAdornment={
        <>
          <Badge variant={PRIORITY_BADGE[need.priority]}>
            {PRIORITY_LABELS[need.priority]}
          </Badge>
          <FreshnessIndicator
            expiresAt={need.expiresAt}
            lastVerifiedAt={need.lastVerifiedAt}
          />
        </>
      }
      footer={footer}
    >
      <DetailSection title={tc.detail_section_meta}>
        <DetailField label={tc.detail_field_description} value={need.description} />
        <DetailField
          label={tc.detail_field_priority}
          value={PRIORITY_LABELS[need.priority]}
        />
        <DetailField
          label={tc.detail_field_status}
          value={STATUS_LABELS[need.status]}
        />
        <DetailField
          label={tc.detail_field_requester_org}
          value={need.requesterOrganizationId}
        />
        <DetailField
          label={tc.detail_field_managing_org}
          value={need.managingOrganizationId}
        />
        <DetailField label={tc.detail_field_required_skill} value={skill} />
        <DetailField
          label={tc.detail_field_requested_count}
          value={need.requestedCount != null ? String(need.requestedCount) : null}
        />
        <DetailField
          label={tc.detail_field_linked_resource}
          value={need.resourceId}
        />
        <DetailField
          label={tc.detail_field_created}
          value={<LocalDate iso={need.createdAt} withTime />}
        />
        <DetailField
          label={tc.detail_field_expiry}
          value={
            need.expiresAt != null ? (
              <LocalDate iso={need.expiresAt} withTime />
            ) : null
          }
        />
      </DetailSection>

      <DetailSection title={tc.detail_section_items}>
        {need.items.length === 0 ? (
          <p className="py-2 text-sm text-muted">{tc.detail_value_none}</p>
        ) : (
          <ul className="flex flex-col gap-2 py-2">
            {need.items.map((item, i) => (
              <li
                key={`${item.name}-${i}`}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              >
                <span className="font-semibold">{item.name}</span>
                <span className="text-muted">
                  {' · '}
                  {categoryLabel(item.category, locale)}
                  {' · '}
                  {item.quantity}
                  {item.unit != null && item.unit !== '' ? ` ${item.unit}` : ''}
                  {item.presentation != null && item.presentation !== ''
                    ? ` · ${item.presentation}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={tc.detail_section_location}>
        <DetailField
          label={tc.detail_field_address}
          value={need.location.address}
        />
        <DetailField label={tc.detail_field_coords} value={coords} />
      </DetailSection>
    </DetailDrawer>
  );
}
