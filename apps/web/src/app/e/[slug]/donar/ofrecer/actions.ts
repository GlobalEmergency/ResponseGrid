'use server';

import { api } from '@/lib/api';
import type { components } from '@responsegrid/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { localizeBackendError } from '@/lib/backend-error-messages';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';
import { isMaterialCategory } from '@/domain/supplies/category';

type OfferCategory =
  components['schemas']['SubmitOfferDto']['items'][number]['category'];

export type OfferState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

export async function submitOffer(
  slug: string,
  emergencyId: string,
  _prev: OfferState,
  formData: FormData,
): Promise<OfferState> {
  const token = await requireSession(`/e/${slug}/donar/ofrecer`);

  const { t, locale } = await getT();

  const rawCategory = formData.get('category');
  const rawDescription = formData.get('description');
  const rawQuantity = formData.get('quantity');
  const rawUnit = formData.get('unit');
  const rawSupplyId = formData.get('supplyId');
  const rawAddress = formData.get('address');
  const rawLatitude = formData.get('latitude');
  const rawLongitude = formData.get('longitude');
  const rawOrgId = formData.get('organizationId');
  const rawNotes = formData.get('notes');
  const rawTargetNeedId = formData.get('targetNeedId');

  // Validate against the DB-backed material catalogue (single source of
  // truth) so every category the UI shows is accepted — avoids the drift
  // where a hardcoded subset rejected clothing/medicines/etc.
  const validMaterialCategories = new Set(
    (await getCategories(locale)).filter(isMaterialCategory).map((c) => c.slug),
  );
  const isCategory = (value: unknown): value is OfferCategory =>
    typeof value === 'string' && validMaterialCategories.has(value);

  if (!isCategory(rawCategory)) {
    return { status: 'error', message: t.donar.err_invalid_category };
  }

  const description =
    typeof rawDescription === 'string' ? rawDescription.trim() : '';
  if (description.length < 2) {
    return {
      status: 'error',
      message: t.donar.err_description_too_short,
    };
  }

  const quantityRaw =
    typeof rawQuantity === 'string' ? Number(rawQuantity) : NaN;
  if (!Number.isInteger(quantityRaw) || quantityRaw <= 0) {
    return { status: 'error', message: t.donar.err_invalid_quantity };
  }

  const latStr = typeof rawLatitude === 'string' ? rawLatitude.trim() : '';
  const lonStr = typeof rawLongitude === 'string' ? rawLongitude.trim() : '';

  if (latStr === '' || lonStr === '') {
    return { status: 'error', message: t.donar.err_location_required };
  }

  const address =
    typeof rawAddress === 'string' && rawAddress.trim() !== ''
      ? rawAddress.trim()
      : t.common.default_address;
  const latitude = Number(latStr);
  const longitude = Number(lonStr);

  const unit =
    typeof rawUnit === 'string' && rawUnit.trim() !== ''
      ? rawUnit.trim()
      : undefined;

  const notes =
    typeof rawNotes === 'string' && rawNotes.trim() !== ''
      ? rawNotes.trim()
      : undefined;

  const supplyId =
    typeof rawSupplyId === 'string' && rawSupplyId.trim() !== ''
      ? rawSupplyId.trim()
      : undefined;

  const donorOrganizationId =
    typeof rawOrgId === 'string' && rawOrgId.trim() !== ''
      ? rawOrgId.trim()
      : undefined;

  const targetNeedId =
    typeof rawTargetNeedId === 'string' && rawTargetNeedId.trim() !== ''
      ? rawTargetNeedId.trim()
      : undefined;

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/offers',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
      body: {
        // The donor form captures a single line; the offer model is multi-line
        // (SupplyLine[]) like needs/resources, so we send it as a one-item list.
        items: [
          {
            name: description,
            quantity: quantityRaw,
            category: rawCategory,
            ...(unit !== undefined ? { unit } : {}),
            ...(supplyId !== undefined ? { supplyId } : {}),
          },
        ],
        location: { address, latitude, longitude },
        ...(targetNeedId !== undefined ? { targetNeedId } : {}),
        ...(donorOrganizationId !== undefined ? { donorOrganizationId } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    },
  );

  if (response.status === 401) {
    return redirectToLogin(`/e/${slug}/donar/ofrecer`);
  }

  if (response.status === 409) {
    return {
      status: 'error',
      message: t.common.intake_paused,
    };
  }

  if (error !== undefined || data === undefined) {
    const rawMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: unknown }).message
        : undefined;
    return {
      status: 'error',
      message: localizeBackendError(t.backendErrors, rawMessage, t.donar.err_submit_failed),
    };
  }

  return { status: 'success', id: data.id };
}
