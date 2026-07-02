'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession, loginHref, authHeaders, clearToken } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getCategories } from '@/adapters/get-categories';
import { isMaterialCategory } from '@/domain/supplies/category';

export type ReceptionActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string };

type Intent = 'receive' | 'reject' | 'incomplete';
function isIntent(v: unknown): v is Intent {
  return v === 'receive' || v === 'reject' || v === 'incomplete';
}

/**
 * Resolve a pending donation intake at the desk: confirm reception, reject, or
 * mark incomplete (the verb travels in the `intent` field so a single form with
 * three buttons shares one notes box). Operator-only — the backend enforces
 * `intake:receive`. On success we redirect back to the reception list so the
 * item leaves the pending queue.
 */
export async function submitReception(
  slug: string,
  intakeId: string,
  _prev: ReceptionActionState,
  formData: FormData,
): Promise<ReceptionActionState> {
  const token = await requireSession(`/e/${slug}/recepcion`);

  const { t, locale } = await getT();
  const tr = t.recepcion;

  const intent = formData.get('intent');
  if (!isIntent(intent)) {
    return { status: 'error', message: tr.err_action_failed };
  }

  const rawNotes = formData.get('volunteerNotes');
  const volunteerNotes =
    typeof rawNotes === 'string' && rawNotes.trim() !== ''
      ? rawNotes.trim()
      : null;

  // Received lines edited at the desk (#129): only sent with `receive`. Reuse
  // the shared parser with material-only category validation; an empty/absent
  // list means "no edit" → keep the declared lines (items stays undefined).
  let items: ReturnType<typeof parseSupplyLines> | undefined;
  let adjustmentReason: string | null = null;
  if (intent === 'receive') {
    const validMaterialCategories = new Set(
      (await getCategories(locale)).filter(isMaterialCategory).map((c) => c.slug),
    );
    items = parseSupplyLines(formData.get('items'), {
      isValidCategory: (c) => validMaterialCategories.has(c),
      allowEmpty: true,
    });
    if (items === null) {
      return { status: 'error', message: tr.err_action_failed };
    }
    const rawReason = formData.get('adjustmentReason');
    adjustmentReason =
      typeof rawReason === 'string' && rawReason.trim() !== ''
        ? rawReason.trim()
        : null;
  }

  // Literal paths (not a computed union) keep the typed client happy.
  const params = { path: { intakeId } } as const;
  const result =
    intent === 'receive'
      ? await api.POST('/donation-intakes/{intakeId}/receive', {
          params,
          headers: authHeaders(token),
          body: {
            volunteerNotes,
            // Empty → keep the declared lines (undefined omits the field).
            items: items && items.length > 0 ? items : undefined,
            adjustmentReason,
          },
        })
      : intent === 'reject'
        ? await api.POST('/donation-intakes/{intakeId}/reject', {
            params,
            headers: authHeaders(token),
            body: { volunteerNotes },
          })
        : await api.POST('/donation-intakes/{intakeId}/incomplete', {
            params,
            headers: authHeaders(token),
            body: { volunteerNotes },
          });

  if (result.response.status === 401) {
    await clearToken();
    redirect(loginHref(`/e/${slug}/recepcion`));
  }
  if (result.response.status === 409) {
    return { status: 'error', message: tr.err_already_processed };
  }
  if (result.response.status === 400) {
    // The only 400 on receive is the missing adjustment reason (#129).
    return { status: 'error', message: tr.err_reason_required };
  }
  if (!result.response.ok) {
    return { status: 'error', message: tr.err_action_failed };
  }
  redirect(`/e/${slug}/recepcion`);
}
