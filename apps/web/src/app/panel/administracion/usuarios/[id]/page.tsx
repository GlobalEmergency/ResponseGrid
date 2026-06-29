import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/molecules/page-header';
import { EmptyState } from '@/components/molecules/empty-state';
import { Badge } from '@/components/atoms/badge';
import { Card } from '@/components/atoms/card';
import { LocalDate } from '@/components/atoms/local-date';
import { getT } from '@/i18n/server';
import { fetchUserDetail } from '../actions';
import { grantScopeLabel, scopeTypeLabel, isExpired } from '../user-presentation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.users_detail_meta_title };
}

export default async function UsuarioDetailPage({ params }: Props) {
  const { id } = await params;

  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/administracion/usuarios/${id}`);

  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meResponse.status === 401 || !me) {
    redirect(`/login?next=/panel/administracion/usuarios/${id}`);
  }
  if (!me.isAdmin) redirect('/');

  const user = await fetchUserDetail(id);

  const { t } = await getT();
  const ta = t.admin;

  if (!user) {
    return (
      <>
        <PageHeader
          title={ta.users_title}
          backHref="/panel/administracion/usuarios"
          backLabel={ta.users_detail_back}
        />
        <EmptyState title={ta.users_detail_not_found} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={user.name || user.email}
        backHref="/panel/administracion/usuarios"
        backLabel={ta.users_detail_back}
      />
      <div className="flex flex-col gap-8">
        {/* ── Resumen ─────────────────────────────────────────────────── */}
        <Card className="flex flex-col gap-3 border-navy p-4">
          {user.isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="verification-official">
                {ta.users_admin_badge}
              </Badge>
            </div>
          )}
          <dl className="flex flex-col gap-1 text-sm text-ink-soft">
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold text-muted">
                {ta.users_email_label}
              </dt>
              <dd className="break-all">{user.email}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold text-muted">
                {ta.users_created_label}
              </dt>
              <dd>
                <LocalDate iso={user.createdAt} />
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold text-muted">
                {ta.users_last_login_label}
              </dt>
              <dd>
                {user.lastLoginAt ? (
                  <LocalDate iso={user.lastLoginAt} withTime />
                ) : (
                  ta.users_never
                )}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold text-muted">ID</dt>
              <dd className="break-all text-xs text-muted">{user.id}</dd>
            </div>
          </dl>
        </Card>

        {/* ── Roles / grants por ámbito ───────────────────────────────── */}
        <section aria-labelledby="grants-heading" className="flex flex-col gap-3">
          <h2 id="grants-heading" className="text-lg font-bold text-ink">
            {ta.users_detail_grants_heading.replace(
              '{count}',
              String(user.grants.length),
            )}
          </h2>
          {user.grants.length === 0 ? (
            <EmptyState title={ta.users_detail_grants_empty} />
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {user.grants.map((g) => {
                const expired = isExpired(g);
                return (
                  <li
                    key={g.id}
                    className="flex flex-col gap-1 rounded-lg border border-line bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {g.roleId}
                      </span>
                      {expired ? (
                        <Badge variant="offer-cancelled">
                          {ta.users_grant_expired}
                        </Badge>
                      ) : (
                        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                          {scopeTypeLabel(g.scopeType, ta)}
                        </span>
                      )}
                    </div>
                    <span className="break-words text-xs text-muted">
                      {ta.users_grant_scope_label} {grantScopeLabel(g, ta)}
                    </span>
                    <span className="text-xs text-muted">
                      {ta.users_grant_granted_label}{' '}
                      <LocalDate iso={g.grantedAt} />
                      {g.expiresAt && (
                        <>
                          {' · '}
                          {ta.users_grant_expires_label}{' '}
                          <LocalDate iso={g.expiresAt} />
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Organizaciones ──────────────────────────────────────────── */}
        <section aria-labelledby="orgs-heading" className="flex flex-col gap-3">
          <h2 id="orgs-heading" className="text-lg font-bold text-ink">
            {ta.users_detail_orgs_heading.replace(
              '{count}',
              String(user.organizations.length),
            )}
          </h2>
          {user.organizations.length === 0 ? (
            <EmptyState title={ta.users_detail_orgs_empty} />
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {user.organizations.map((o) => (
                <li key={o.organizationId}>
                  <Link
                    href={`/panel/administracion/organizaciones/${o.organizationId}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 transition-colors hover:bg-surface"
                  >
                    <span className="min-w-0 break-words text-sm font-semibold text-ink">
                      {o.organizationName} →
                    </span>
                    <Badge
                      variant={o.role === 'owner' ? 'role-owner' : 'role-member'}
                    >
                      {o.role === 'owner'
                        ? ta.orgs_detail_role_owner
                        : ta.orgs_detail_role_member}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Actividad reciente ──────────────────────────────────────── */}
        <section
          aria-labelledby="activity-heading"
          className="flex flex-col gap-3"
        >
          <h2 id="activity-heading" className="text-lg font-bold text-ink">
            {ta.users_detail_activity_heading.replace(
              '{count}',
              String(user.activity.length),
            )}
          </h2>
          {user.activity.length === 0 ? (
            <EmptyState title={ta.users_detail_activity_empty} />
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {user.activity.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-0.5 rounded-lg border border-line bg-white p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {a.action}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted">
                      <LocalDate iso={a.createdAt} withTime />
                    </span>
                  </div>
                  <span className="break-all font-mono text-xs text-muted">
                    {a.method} {a.path} · {a.statusCode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
