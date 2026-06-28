'use client';

import { useActionState, useEffect } from 'react';
import { verifyAndPublish } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import { DetailField, DetailSection } from '@/components/molecules/detail-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type ResourceView = components['schemas']['ResourceViewDto'];

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface ResourceDetailProps {
  resource: ResourceView;
  slug: string;
  /** Whether the user may verify (gates the action button). */
  canVerify: boolean;
  open: boolean;
  onClose: () => void;
  onActionSuccess: () => void;
}

export function ResourceDetail({
  resource,
  slug,
  canVerify,
  open,
  onClose,
  onActionSuccess,
}: ResourceDetailProps) {
  const tc = getMessages(useLocale()).coord;

  const TYPE_LABELS: Record<ResourceView['type'], string> = {
    collection_point: tc.resource_type_collection_point,
    delivery_point: tc.resource_type_delivery_point,
    collection_and_delivery: tc.resource_type_collection_and_delivery,
    warehouse: tc.resource_type_warehouse,
    transport: tc.resource_type_transport,
    supplier: tc.resource_type_supplier,
    venue: tc.resource_type_venue,
  };

  const STAGE_LABELS: Record<ResourceView['stage'], string> = {
    origin: tc.resource_stage_origin,
    intermediate: tc.resource_stage_intermediate,
    destination: tc.resource_stage_destination,
  };

  const PUBLIC_STATUS_LABELS: Record<ResourceView['publicStatus'], string> = {
    hidden: tc.public_status_hidden,
    active: tc.public_status_active,
    saturated: tc.public_status_saturated,
    paused: tc.public_status_paused,
    closed: tc.public_status_closed,
  };

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    () => verifyAndPublish(resource.id, slug),
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.status === 'success') onActionSuccess();
  }, [state.status, onActionSuccess]);

  const coords = `${resource.location.latitude}, ${resource.location.longitude}`;
  const accepts =
    resource.accepts.length > 0 ? resource.accepts.join(', ') : null;

  const footer = canVerify ? (
    <div className="flex flex-col gap-3">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? tc.error_unknown} />
      )}
      <form action={formAction}>
        <Button type="submit" disabled={pending} fullWidth size="lg">
          {pending ? tc.processing : tc.resource_verify_publish}
        </Button>
      </form>
    </div>
  ) : undefined;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={resource.name}
      ariaLabel={tc.drawer_open_resource.replace('{name}', resource.name)}
      titleAdornment={<VerificationBadge level={resource.verificationLevel} />}
      footer={footer}
    >
      <DetailSection title={tc.detail_section_meta}>
        <DetailField
          label={tc.detail_field_description}
          value={resource.description}
        />
        <DetailField
          label={tc.detail_field_type}
          value={TYPE_LABELS[resource.type]}
        />
        <DetailField
          label={tc.detail_field_stage}
          value={STAGE_LABELS[resource.stage]}
        />
        <DetailField label={tc.detail_field_accepts} value={accepts} />
        <DetailField
          label={tc.detail_field_public_status}
          value={PUBLIC_STATUS_LABELS[resource.publicStatus]}
        />
        <DetailField
          label={tc.detail_field_is_final_recipient}
          value={resource.isFinalRecipient ? tc.detail_value_yes : null}
        />
        <DetailField
          label={tc.detail_field_recipient_type}
          value={resource.recipientType}
        />
        <DetailField label={tc.detail_field_contact} value={resource.contact} />
        <DetailField label={tc.detail_field_schedule} value={resource.schedule} />
        <DetailField label={tc.detail_field_manager} value={resource.manager} />
        <DetailField label={tc.detail_field_source} value={resource.sourceName} />
      </DetailSection>

      <DetailSection title={tc.detail_section_location}>
        <DetailField
          label={tc.detail_field_address}
          value={resource.location.address}
        />
        <DetailField label={tc.detail_field_coords} value={coords} />
        <DetailField label={tc.detail_field_city} value={resource.city} />
        <DetailField label={tc.detail_field_country} value={resource.country} />
      </DetailSection>
    </DetailDrawer>
  );
}
