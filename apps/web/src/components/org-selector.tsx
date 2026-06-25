import { api } from '@/lib/api';
import { authHeaders, getToken } from '@/lib/auth';

/**
 * OrgSelector — Server Component.
 *
 * Renders a <select name="organizationId"> with:
 *   - "A título particular" (empty value, always first)
 *   - One <option> per organization the authenticated user belongs to.
 *
 * If the user is unauthenticated or has no organizations, only the
 * "A título particular" option is shown — the component never throws.
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

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="organizationId"
        className="text-sm font-semibold text-gray-900"
      >
        ¿En nombre de quién?
      </label>
      <select
        id="organizationId"
        name="organizationId"
        className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      >
        <option value="">A título particular</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
