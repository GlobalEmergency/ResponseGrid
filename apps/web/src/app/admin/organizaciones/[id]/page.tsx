import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { EmptyState } from '@/components/molecules/empty-state';
import { Badge } from '@/components/atoms/badge';
import { LocalDate } from '@/components/atoms/local-date';
import { shortId } from '@/lib/permissions';
import { getT } from '@/i18n/server';
import { fetchOrganizationDetail } from '../actions';
import {
  orgTypeLabel,
  accreditationLabel,
  accreditationBadgeVariant,
  verificationLabel,
} from '../org-presentation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.orgs_detail_meta_title };
}

export default async function OrganizacionDetailPage({ params }: Props) {
  const { id } = await params;

  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) redirect(`/login?next=/admin/organizaciones/${id}`);

  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meResponse.status === 401 || !me) {
    redirect(`/login?next=/admin/organizaciones/${id}`);
  }
  if (!me.isAdmin) redirect('/');

  const org = await fetchOrganizationDetail(id);

  const { t } = await getT();
  const ta = t.admin;

  if (!org) {
    return (
      <main className="flex-1 bg-surface">
        <div className="mx-auto w-full max-w-xl">
          <PageHeaderBand
            backHref="/admin/organizaciones"
            backLabel={ta.orgs_detail_back}
            title={ta.orgs_title}
          />
          <div className="px-4 pb-12 pt-6">
            <EmptyState title={ta.orgs_detail_not_found} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/admin/organizaciones"
          backLabel={ta.orgs_detail_back}
          title={org.name}
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">
          {/* ── Resumen ─────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-3 rounded-lg border-2 border-navy bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={accreditationBadgeVariant(org.accreditationStatus)}>
                {accreditationLabel(org.accreditationStatus, ta)}
              </Badge>
              <Badge
                variant={
                  org.verificationLevel === 'official'
                    ? 'verification-official'
                    : org.verificationLevel === 'verified'
                      ? 'verification-verified'
                      : 'unverified'
                }
              >
                {verificationLabel(org.verificationLevel, ta)}
              </Badge>
            </div>
            <dl className="flex flex-col gap-1 text-sm text-gray-700">
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.orgs_type_label}
                </dt>
                <dd>{orgTypeLabel(org.type, ta)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.orgs_taxid_label}
                </dt>
                <dd className="break-all">{org.taxId ?? ta.orgs_none}</dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.orgs_contact_label}
                </dt>
                <dd className="break-all">{org.contactEmail ?? ta.orgs_none}</dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.orgs_detail_created_label}
                </dt>
                <dd>
                  <LocalDate iso={org.createdAt} />
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-400">ID</dt>
                <dd className="break-all text-xs text-gray-400">{org.id}</dd>
              </div>
            </dl>
          </section>

          {/* ── Miembros ────────────────────────────────────────────────── */}
          <section aria-labelledby="members-heading" className="flex flex-col gap-3">
            <h2 id="members-heading" className="text-lg font-bold text-ink">
              {ta.orgs_detail_members_heading.replace(
                '{count}',
                String(org.members.length),
              )}
            </h2>
            {org.members.length === 0 ? (
              <EmptyState title={ta.orgs_detail_members_empty} />
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {org.members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {m.name || shortId(m.userId)}
                      </span>
                      {m.email && (
                        <span className="break-all text-xs text-gray-500">
                          {m.email}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant={m.role === 'owner' ? 'role-owner' : 'role-member'}
                    >
                      {m.role === 'owner'
                        ? ta.orgs_detail_role_owner
                        : ta.orgs_detail_role_member}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Cuentas de servicio / API keys ──────────────────────────── */}
          <section aria-labelledby="accounts-heading" className="flex flex-col gap-3">
            <h2 id="accounts-heading" className="text-lg font-bold text-ink">
              {ta.orgs_detail_accounts_heading.replace(
                '{count}',
                String(org.serviceAccounts.length),
              )}
            </h2>
            {org.serviceAccounts.length === 0 ? (
              <EmptyState title={ta.orgs_detail_accounts_empty} />
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {org.serviceAccounts.map((sa) => (
                  <li
                    key={sa.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {sa.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ta.orgs_detail_keys_summary
                          .replace('{total}', String(sa.keyCount))
                          .replace('{active}', String(sa.activeKeyCount))}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      <LocalDate iso={sa.createdAt} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Acreditaciones ──────────────────────────────────────────── */}
          <section
            aria-labelledby="accreditations-heading"
            className="flex flex-col gap-3"
          >
            <h2
              id="accreditations-heading"
              className="text-lg font-bold text-ink"
            >
              {ta.orgs_detail_accreditations_heading.replace(
                '{count}',
                String(org.accreditations.length),
              )}
            </h2>
            {org.accreditations.length === 0 ? (
              <EmptyState title={ta.orgs_detail_accreditations_empty} />
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {org.accreditations.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex flex-col gap-0.5 rounded-lg border border-line bg-white p-3"
                  >
                    <span className="text-sm font-semibold text-gray-900">
                      {acc.scope === 'global'
                        ? ta.acc_scope_global
                        : ta.acc_scope_emergency.replace(
                            '{id}',
                            acc.scope.emergencyId,
                          )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {ta.acc_granted_label}{' '}
                      <LocalDate iso={acc.grantedAt} />
                    </span>
                    {acc.evidence && (
                      <span className="break-all text-xs text-gray-500">
                        {ta.acc_evidence_label} {acc.evidence}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Emergencias en las que participa ────────────────────────── */}
          <section
            aria-labelledby="emergencies-heading"
            className="flex flex-col gap-3"
          >
            <h2
              id="emergencies-heading"
              className="text-lg font-bold text-ink"
            >
              {ta.orgs_detail_emergencies_heading.replace(
                '{count}',
                String(org.emergencyIds.length),
              )}
            </h2>
            {org.emergencyIds.length === 0 ? (
              <EmptyState title={ta.orgs_detail_emergencies_empty} />
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {org.emergencyIds.map((emergencyId) => (
                  <li key={emergencyId}>
                    <Link
                      href={`/admin/acreditaciones`}
                      className="block break-all rounded-lg border border-line bg-white p-3 font-mono text-xs text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {emergencyId}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
