import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import {
  getMe,
  getRoles,
  getMyEmergencies,
  getActiveEmergencies,
  getNotificationUnread,
} from '@/lib/navigation-data';
import {
  canAdminister,
  type MeGrant,
  type RoleCatalogEntry,
} from '@/lib/admin-scopes';
import { canCoordinateAtPlatform } from '@/lib/emergency-permissions';
import { Card } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { SectionHeading } from '@/components/atoms/section-heading';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.panel.meta_title, description: t.panel.meta_description };
}

export default async function PanelPage() {
  const token = await getToken();
  if (token == null) redirect('/login?next=/panel');

  const me = await getMe();
  if (me == null) redirect('/login?next=/panel');

  const { t } = await getT();
  const tp = t.panel;

  const [roles, myEmergencies, activeEmergencies, unread, groupsRes, orgsRes] =
    await Promise.all([
      getRoles(),
      getMyEmergencies(),
      getActiveEmergencies(),
      getNotificationUnread(),
      api.GET('/groups/mine', { headers: authHeaders(token) }),
      api.GET('/organizations/mine', { headers: authHeaders(token) }),
    ]);

  const roleDesc = new Map(roles.map((r) => [r.id, r.description ?? r.id]));
  const groups = groupsRes.data ?? [];
  const orgs = orgsRes.data ?? [];
  const grants = (me.grants ?? []) as MeGrant[];
  const roleCatalog = roles as RoleCatalogEntry[];
  const isManager = me.isAdmin === true || canAdminister(grants, roleCatalog);

  // Platform-level overlay: an admin/operator holds platform-scoped coordination
  // grants but no emergency-scoped grant, so "Mis emergencias" is empty. Surface
  // every active emergency they can validate, minus the ones already listed
  // above (de-dupe by id) to avoid showing the same emergency twice.
  const myEmergencyIds = new Set(myEmergencies.map((e) => e.id));
  const validationEmergencies =
    me.isAdmin === true || canCoordinateAtPlatform(grants, roleCatalog)
      ? activeEmergencies.filter((e) => !myEmergencyIds.has(e.id))
      : [];

  const sectionGap = 'flex flex-col gap-3';

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader title={tp.title} subtitle={tp.subtitle} />

        <section aria-labelledby="qa-heading" className={sectionGap}>
          <SectionHeading id="qa-heading" size="sm">
            {tp.quick_actions_heading}
          </SectionHeading>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isManager && (
              <QuickAction href="/panel/administracion" label={tp.qa_administration} />
            )}
            <QuickAction
              href="/panel/notificaciones"
              label={
                unread > 0
                  ? `${tp.qa_notifications} (${unread > 99 ? '99+' : unread})`
                  : tp.qa_notifications
              }
            />
            <QuickAction href="/panel/grupos" label={t.nav.my_groups} />
            <QuickAction
              href="/panel/mis-donaciones"
              label={tp.qa_my_donations}
            />
            <QuickAction href="/panel/mi-perfil" label={tp.qa_my_profile} />
            <QuickAction href="/" label={tp.qa_explore} />
          </div>
        </section>

        <section aria-labelledby="emg-heading" className={sectionGap}>
          <SectionHeading id="emg-heading" size="sm">
            {tp.emergencies_heading}
          </SectionHeading>
          {myEmergencies.length === 0 ? (
            <EmptyState title={tp.emergencies_empty} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" role="list">
              {myEmergencies.map((e) => (
                <li key={e.id}>
                  <Card as="article" className="flex h-full flex-col gap-3 p-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-display text-base font-bold text-navy">
                        {e.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {e.roleIds.map((rid) => (
                          <Badge key={rid} variant="role-member">
                            {roleDesc.get(rid) ?? rid}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/e/${e.slug}/coordinacion`}
                      className="mt-auto inline-flex w-fit items-center rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
                    >
                      {tp.enter_coordination}
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Coordination / validation — platform-level overlay. Only rendered
            for platform coordinators/admins with active emergencies to reach. */}
        {validationEmergencies.length > 0 && (
          <section aria-labelledby="val-heading" className={sectionGap}>
            <div className="flex flex-col gap-1">
              <SectionHeading id="val-heading" size="sm">
                {tp.validation_heading}
              </SectionHeading>
              <p className="text-sm text-muted">{tp.validation_hint}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2" role="list">
              {validationEmergencies.map((e) => (
                <li key={e.id}>
                  <Card as="article" className="flex h-full flex-col gap-3 p-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-display text-base font-bold text-navy">
                        {e.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="active">{statusLabel(tp, e.status)}</Badge>
                      </div>
                    </div>
                    <Link
                      href={`/e/${e.slug}/coordinacion`}
                      className="mt-auto inline-flex w-fit items-center rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
                    >
                      {tp.enter_validation}
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="grp-heading" className={sectionGap}>
          <SectionHeading id="grp-heading" size="sm">
            {tp.groups_heading}
          </SectionHeading>
          {groups.length === 0 ? (
            <EmptyState title={tp.groups_empty} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" role="list">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link href={`/panel/grupos/${g.id}`} className="block">
                    <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface">
                      <span className="truncate text-sm font-semibold text-ink">
                        {g.name}
                      </span>
                      <Badge
                        variant={
                          g.membershipStatus === 'approved'
                            ? 'offer-fulfilled'
                            : 'offer-matched'
                        }
                      >
                        {g.membershipStatus === 'approved'
                          ? tp.group_approved
                          : tp.group_pending}
                      </Badge>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="org-heading" className={sectionGap}>
          <SectionHeading id="org-heading" size="sm">
            {tp.orgs_heading}
          </SectionHeading>
          {orgs.length === 0 ? (
            <EmptyState title={tp.orgs_empty} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" role="list">
              {orgs.map((o) => (
                <li key={o.id}>
                  <Link href={`/panel/organizaciones/${o.id}`} className="block">
                    <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface">
                      <span className="truncate text-sm font-semibold text-ink">
                        {o.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{o.type}</span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageContainer>
    </main>
  );
}

function statusLabel(
  tp: { status_active: string; status_paused: string; status_closed: string },
  status: 'active' | 'paused' | 'closed',
): string {
  if (status === 'paused') return tp.status_paused;
  if (status === 'closed') return tp.status_closed;
  return tp.status_active;
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block">
      <Card className="flex h-full items-center justify-center px-3 py-4 text-center text-sm font-semibold text-navy transition-colors hover:bg-surface">
        {label}
      </Card>
    </Link>
  );
}
