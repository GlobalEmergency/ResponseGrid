'use server';

import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { getT } from '@/i18n/server';

type OrgType =
  | 'ngo'
  | 'company'
  | 'public_admin'
  | 'association'
  | 'transport_operator'
  | 'other';

/**
 * The shape stored in the OrgSelector's local list — matches the
 * `OrganizationViewDto` returned by `GET /organizations/mine` so a freshly
 * created org can be appended to the same array without type juggling.
 */
export interface CreatedOrg {
  id: string;
  name: string;
  type: OrgType;
  verificationLevel: string;
}

export type CreateOrgInlineResult =
  | { ok: true; org: CreatedOrg }
  | { ok: false; message: string };

const ORG_TYPES: readonly OrgType[] = [
  'ngo',
  'company',
  'public_admin',
  'association',
  'transport_operator',
  'other',
];

function isOrgType(value: string): value is OrgType {
  return (ORG_TYPES as readonly string[]).includes(value);
}

/**
 * Creates an organization and returns it (instead of redirecting like the
 * `/organizaciones` page action). Used by the inline "create organization"
 * modal so the caller can immediately select the new org in its form.
 */
export async function createOrganizationInline(input: {
  name: string;
  type: string;
  taxId?: string;
  contactEmail?: string;
}): Promise<CreateOrgInlineResult> {
  const token = await getToken();
  const { t } = await getT();

  if (!token) {
    return { ok: false, message: t.organizaciones.err_create_failed };
  }

  const name = input.name.trim();
  const type = input.type.trim();
  const taxId = input.taxId?.trim() || undefined;
  const contactEmail = input.contactEmail?.trim() || undefined;

  if (!name || !isOrgType(type)) {
    return { ok: false, message: t.organizaciones.err_name_type_required };
  }

  const { data, error } = await api.POST('/organizations', {
    headers: authHeaders(token),
    body: {
      name,
      type,
      ...(taxId !== undefined ? { taxId } : {}),
      ...(contactEmail !== undefined ? { contactEmail } : {}),
    },
  });

  if (error !== undefined || data === undefined) {
    return { ok: false, message: t.organizaciones.err_create_failed };
  }

  // New organizations start unverified; the selector only displays the name,
  // but we keep the full shape consistent with `/organizations/mine`.
  return { ok: true, org: { id: data.id, name, type, verificationLevel: 'unverified' } };
}
