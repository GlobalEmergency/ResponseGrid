'use client';

import { useActionState, useState, useEffect } from 'react';
import {
  matchOffer,
  fulfillOffer,
  cancelOffer,
  editOffer,
  discardOffer,
} from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import {
  ValidationActions,
  type EditField,
} from '@/components/organisms/validation-actions';
import { DetailField, DetailSection } from '@/components/molecules/detail-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { categoryLabel } from '@/lib/categories';

type OfferViewDto = components['schemas']['OfferViewDto'];
type NeedViewDto = components['schemas']['NeedViewDto'];

const STATUS_BADGE: Record<
  OfferViewDto['status'],
  'offer-open' | 'offer-matched' | 'offer-fulfilled' | 'offer-cancelled'
> = {
  open: 'offer-open',
  matched: 'offer-matched',
  fulfilled: 'offer-fulfilled',
  cancelled: 'offer-cancelled',
};

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface OfferDetailProps {
  offer: OfferViewDto;
  /** Validated needs available to match against (for general offers). */
  validatedNeeds: NeedViewDto[];
  slug: string;
  /** Whether the user may match/fulfill/cancel (gates the action forms). */
  canMatch: boolean;
  open: boolean;
  onClose: () => void;
  onActionSuccess: () => void;
}

export function OfferDetail({
  offer,
  validatedNeeds,
  slug,
  canMatch,
  open,
  onClose,
  onActionSuccess,
}: OfferDetailProps) {
  const locale = useLocale();
  const tc = getMessages(locale).coord;

  const STATUS_LABELS: Record<OfferViewDto['status'], string> = {
    open: tc.offer_status_open,
    matched: tc.offer_status_matched,
    fulfilled: tc.offer_status_fulfilled,
    cancelled: tc.offer_status_cancelled,
  };

  const [selectedNeedId, setSelectedNeedId] = useState('');

  const [matchState, matchFormAction, matchPending] = useActionState<
    ActionResult,
    FormData
  >(async () => {
    const needId =
      typeof offer.targetNeedId === 'string' && offer.targetNeedId !== ''
        ? offer.targetNeedId
        : selectedNeedId;
    if (needId === '') {
      return { status: 'error', message: tc.offer_select_need_error };
    }
    return matchOffer(offer.id, needId, slug);
  }, INITIAL_STATE);

  const [fulfillState, fulfillFormAction, fulfillPending] = useActionState<
    ActionResult,
    FormData
  >(async () => fulfillOffer(offer.id, slug), INITIAL_STATE);

  const [cancelState, cancelFormAction, cancelPending] = useActionState<
    ActionResult,
    FormData
  >(async () => cancelOffer(offer.id, slug), INITIAL_STATE);

  // Any successful transition removes the offer from the open/matched queue.
  useEffect(() => {
    if (
      matchState.status === 'success' ||
      fulfillState.status === 'success' ||
      cancelState.status === 'success'
    ) {
      onActionSuccess();
    }
  }, [matchState.status, fulfillState.status, cancelState.status, onActionSuccess]);

  const errorMessage =
    (matchState.status === 'error' ? matchState.message : undefined) ??
    (fulfillState.status === 'error' ? fulfillState.message : undefined) ??
    (cancelState.status === 'error' ? cancelState.message : undefined);

  const isDirected =
    typeof offer.targetNeedId === 'string' && offer.targetNeedId !== '';
  const unit =
    typeof offer.unit === 'string' && offer.unit !== '' ? offer.unit : null;
  const coords = `${offer.location.latitude}, ${offer.location.longitude}`;
  const quantity = `${offer.quantity}${unit !== null ? ` ${unit}` : ''}`;

  const editFields: EditField[] = [
    {
      key: 'description',
      label: tc.detail_field_description,
      kind: 'textarea',
      defaultValue: offer.description,
    },
    {
      key: 'quantity',
      label: tc.edit_field_quantity,
      kind: 'number',
      defaultValue: String(offer.quantity),
    },
    {
      key: 'unit',
      label: tc.edit_field_unit,
      kind: 'text',
      defaultValue: offer.unit ?? '',
    },
    {
      key: 'notes',
      label: tc.edit_field_notes,
      kind: 'textarea',
      defaultValue: offer.notes ?? '',
    },
  ];

  const actions =
    canMatch && offer.status === 'open' ? (
      <div className="flex flex-col gap-3">
        <form action={matchFormAction} className="flex flex-col gap-2">
          {!isDirected && validatedNeeds.length > 0 && (
            <Select
              id={`need-select-detail-${offer.id}`}
              name="needId"
              aria-label={tc.offer_select_need_label}
              value={selectedNeedId}
              onChange={(e) => setSelectedNeedId(e.target.value)}
            >
              <option value="" disabled>
                {tc.offer_select_need_placeholder}
              </option>
              {validatedNeeds.map((need) => (
                <option key={need.id} value={need.id}>
                  {need.title}
                </option>
              ))}
            </Select>
          )}
          <Button
            type="submit"
            disabled={matchPending || (!isDirected && selectedNeedId === '')}
            fullWidth
            size="lg"
          >
            {matchPending
              ? tc.processing
              : isDirected
                ? tc.offer_confirm_directed
                : tc.offer_assign}
          </Button>
        </form>
        <form action={cancelFormAction}>
          <Button
            type="submit"
            disabled={cancelPending}
            fullWidth
            size="lg"
            variant="danger-outline"
          >
            {cancelPending ? tc.cancelling : tc.offer_cancel}
          </Button>
        </form>
      </div>
    ) : canMatch && offer.status === 'matched' ? (
      <div className="flex flex-col gap-3">
        <form action={fulfillFormAction}>
          <Button type="submit" disabled={fulfillPending} fullWidth size="lg">
            {fulfillPending ? tc.processing : tc.offer_mark_delivered}
          </Button>
        </form>
        <form action={cancelFormAction}>
          <Button
            type="submit"
            disabled={cancelPending}
            fullWidth
            size="lg"
            variant="danger-outline"
          >
            {cancelPending ? tc.cancelling : tc.offer_cancel}
          </Button>
        </form>
      </div>
    ) : null;

  // Edit/discard only make sense while the offer is still live; a fulfilled or
  // cancelled offer is terminal (the API would reject both with 409).
  const canEditOrDiscard =
    canMatch && (offer.status === 'open' || offer.status === 'matched');

  const footer =
    actions != null || errorMessage !== undefined || canEditOrDiscard ? (
      <div className="flex flex-col gap-3">
        {errorMessage !== undefined && <ErrorMessage message={errorMessage} />}
        {actions}
        <ValidationActions
          canAct={canEditOrDiscard}
          editFields={editFields}
          onEdit={(reason, values) =>
            editOffer(offer.id, slug, {
              reason,
              description: values.description,
              quantity:
                values.quantity && values.quantity.trim() !== ''
                  ? Number(values.quantity)
                  : undefined,
              unit: values.unit,
              notes: values.notes,
            })
          }
          onDiscard={(reason) => discardOffer(offer.id, slug, reason)}
          onActionSuccess={onActionSuccess}
        />
      </div>
    ) : undefined;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={offer.description}
      ariaLabel={tc.drawer_open_offer.replace('{description}', offer.description)}
      titleAdornment={
        <Badge variant={STATUS_BADGE[offer.status]}>
          {STATUS_LABELS[offer.status]}
        </Badge>
      }
      footer={footer}
    >
      {isDirected && (
        <p className="pb-2 text-xs font-medium text-warning">
          {tc.offer_directed_indicator}
        </p>
      )}

      <DetailSection title={tc.detail_section_meta}>
        <DetailField
          label={tc.detail_field_category}
          value={categoryLabel(offer.category, locale)}
        />
        <DetailField label={tc.detail_field_quantity} value={quantity} />
        <DetailField
          label={tc.detail_field_status}
          value={STATUS_LABELS[offer.status]}
        />
        <DetailField
          label={tc.detail_field_donor_org}
          value={offer.donorOrganizationId}
        />
        <DetailField
          label={tc.detail_field_donor_user}
          value={offer.donorUserId}
        />
        <DetailField label={tc.detail_field_notes} value={offer.notes} />
        <DetailField
          label={tc.detail_field_target_need}
          value={offer.targetNeedId}
        />
        <DetailField
          label={tc.detail_field_matched_need}
          value={offer.matchedNeedId}
        />
      </DetailSection>

      <DetailSection title={tc.detail_section_location}>
        <DetailField
          label={tc.detail_field_address}
          value={offer.location.address}
        />
        <DetailField label={tc.detail_field_coords} value={coords} />
      </DetailSection>
    </DetailDrawer>
  );
}
