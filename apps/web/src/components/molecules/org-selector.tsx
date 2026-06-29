import { api } from '@/lib/api';
import { authHeaders, getToken } from '@/lib/auth';
import { OrgSelectorField } from './org-selector-field';

/**
 * OrgSelector — Server Component.
 *
 * Fetches the organizations the authenticated user belongs to and hands them to
 * the interactive {@link OrgSelectorField}, which renders:
 *   - "as an individual" (empty value, always first)
 *   - One <option> per organization
 *   - A "create organization" trigger that opens a modal; the new org is
 *     appended and auto-selected.
 *
 * If the user is unauthenticated or has no organizations, only the
 * "as an individual" option is shown — the component never throws.
 *
 * Include inside a <form> and the selected organizationId will be submitted
 * with the rest of the form fields.
 */
export async function OrgSelector() {
  const token = await getToken();

  let orgs: Array<{ id: string; name: string; type: string; verificationLevel: string }> =
    [];

  if (token) {
    const { data } = await api.GET('/organizations/mine', {
      headers: authHeaders(token),
    });
    orgs = data ?? [];
  }

  return <OrgSelectorField initialOrgs={orgs} />;
}
