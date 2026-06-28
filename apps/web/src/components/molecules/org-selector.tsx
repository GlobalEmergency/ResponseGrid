import { api } from '@/lib/api';
import { authHeaders, getToken } from '@/lib/auth';
import { getT } from '@/i18n/server';

/**
 * OrgSelector — Server Component.
 *
 * Renders a <select name="organizationId"> with:
 *   - "as an individual" (empty value, always first)
 *   - One <option> per organization the authenticated user belongs to.
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

  const { t } = await getT();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="organizationId"
        className="text-sm font-semibold text-ink"
      >
        {t.ui.on_behalf_of}
      </label>
      <select
        id="organizationId"
        name="organizationId"
        className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
      >
        <option value="">{t.ui.as_individual}</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
