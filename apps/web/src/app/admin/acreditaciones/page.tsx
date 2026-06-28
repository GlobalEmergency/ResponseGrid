import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchAccreditations } from './actions';
import { GrantAccreditationForm } from './grant-form';
import { RevokeButton } from './revoke-button';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { formatDate } from '@/lib/format-date';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.admin.acc_meta_title,
    description: t.admin.acc_meta_description,
  };
}

export default async function AcreditacionesPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/admin/acreditaciones');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/admin/acreditaciones');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  // ── Fetch existing accreditations ────────────────────────────────────────
  const accreditations = await fetchAccreditations();

  const { t, locale } = await getT();
  const ta = t.admin;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/"
          backLabel={ta.back}
          title={ta.acc_title}
          subtitle={ta.acc_subtitle}
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        <p className="text-xs text-warning bg-warning-soft border border-warning rounded px-3 py-2">
          {ta.acc_manual_note}{' '}
          <Link
            href="/admin/organizaciones"
            className="font-semibold underline underline-offset-2 hover:text-ink"
          >
            {ta.orgs_link}
          </Link>
        </p>

        {/* ── LISTADO DE ACREDITACIONES ────────────────────────────────── */}
        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-ink">
            {ta.acc_list_heading.replace('{count}', String(accreditations.length))}
          </h2>

          {accreditations.length === 0 ? (
            <EmptyState
              title={ta.acc_empty_title}
              description={ta.acc_empty_description}
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {accreditations.map((acc) => {
                const scopeLabel =
                  acc.scope === 'global'
                    ? ta.acc_scope_global
                    : ta.acc_scope_emergency.replace('{id}', acc.scope.emergencyId);

                return (
                  <li
                    key={acc.id}
                    className="flex items-start justify-between gap-4 rounded-lg border-2 border-navy bg-white p-4"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-ink break-all">
                        {ta.acc_org_label} {acc.organizationId}
                      </span>
                      <span className="text-xs text-muted font-medium">
                        {ta.acc_scope_label} {scopeLabel}
                      </span>
                      {acc.evidence && (
                        <span className="text-xs text-muted break-all">
                          {ta.acc_evidence_label} {acc.evidence}
                        </span>
                      )}
                      <span className="text-xs text-muted-soft">
                        {ta.acc_granted_label}{' '}
                        <time dateTime={acc.grantedAt} suppressHydrationWarning>
                          {formatDate(acc.grantedAt, locale)}
                        </time>
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <RevokeButton accreditationId={acc.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <hr className="border-line" />

        {/* ── CONCEDER ACREDITACIÓN ────────────────────────────────────── */}
        <section aria-labelledby="grant-heading" className="flex flex-col gap-4">
          <h2 id="grant-heading" className="text-xl font-bold text-ink">
            {ta.acc_grant_heading}
          </h2>
          <GrantAccreditationForm />
        </section>

        </div>
      </div>
    </main>
  );
}
