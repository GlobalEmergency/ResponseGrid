import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { DashboardLayout } from '@/lib/dashboard-layout';
import { EmergencyContextBanner } from '@/components/molecules/emergency-context-banner';
import { CoordinationTabs } from '@/components/organisms/coordination-tabs';
import { Badge } from '@/components/atoms/badge';
import type { Messages } from '@/i18n/messages/es';

/** Friendly per-role label, falling back to the catalog description. */
function roleLabel(
  roleId: string,
  tc: Messages['coord'],
  roleDesc: Map<string, string>,
): string {
  switch (roleId) {
    case 'emergency_coordinator':
      return tc.role_emergency_coordinator;
    case 'emergency_verifier':
      return tc.role_emergency_verifier;
    case 'platform_admin':
      return tc.role_platform_admin;
    case 'platform_operator':
      return tc.role_platform_operator;
    default:
      return roleDesc.get(roleId) ?? roleId;
  }
}

/**
 * Coordination shell: dashboard chrome + emergency context banner, plus the
 * panel container, integrated header (title · emergency name · role badges) and
 * the permission-aware sub-nav ({@link CoordinationTabs}). Every coordination
 * page renders only its own sections inside this frame — the header and tabs no
 * longer live in each page.
 */
export default async function CoordinacionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergency.id,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  const { t } = await getT();
  const tc = t.coord;
  const roleDesc = new Map(roles.map((r) => [r.id, r.description ?? r.id]));

  const banner = (
    <EmergencyContextBanner
      name={emergency.name}
      slug={slug}
      contextLabel={t.nav.emergency_context}
      exitLabel={t.nav.exit_emergency}
    />
  );

  return (
    <DashboardLayout emergencyContext={banner}>
      <main className="flex-1 bg-surface">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 pb-12 pt-6 lg:max-w-5xl lg:px-8">
          <header className="flex flex-col gap-2">
            <h1 className="font-display text-xl font-bold text-navy lg:text-2xl">
              {tc.dashboard_title}
            </h1>
            <p className="text-sm text-muted">{emergency.name}</p>
            {access.roleIds.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">{tc.your_role_heading}</span>
                {access.roleIds.map((rid) => (
                  <Badge key={rid} variant="role-owner">
                    {roleLabel(rid, tc, roleDesc)}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          <CoordinationTabs
            slug={slug}
            access={{
              canVerifyResources: access.canVerifyResources,
              canValidateNeeds: access.canValidateNeeds,
              canMatchOffers: access.canMatchOffers,
              canCoordinateLogistics: access.canCoordinateLogistics,
              canCoordinate: access.canCoordinate,
              canViewAudit: access.canViewAudit,
            }}
          />

          {children}
        </div>
      </main>
    </DashboardLayout>
  );
}
