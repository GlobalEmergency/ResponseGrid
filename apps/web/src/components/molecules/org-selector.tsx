import { api } from '@/lib/api';
import { authHeaders, getToken } from '@/lib/auth';
import { OrgSelectorField } from './org-selector-field';

/**
 * Unauthenticated or no organizations → only the "as an individual" option is
 * shown; the component never throws. Include inside a <form> and the selected
 * organizationId is submitted with the rest of the form fields.
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
