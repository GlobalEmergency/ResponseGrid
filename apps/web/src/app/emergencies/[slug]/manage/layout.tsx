import type { ReactNode } from 'react';
import { getT } from '@/i18n/server';
import { getRoles } from '@/lib/navigation-data';
import { resolveManageAccess } from '@/lib/manage-access';
import { DashboardLayout } from '@/lib/dashboard-layout';
import { ContextSwitcher } from '@/components/molecules/context-switcher';
import { PageContainer } from '@/components/molecules/page-container';
import { Badge } from '@/components/atoms/badge';
import type { Messages } from '@/i18n/messages/es';

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
 * Emergency workspace shell: resolves session/emergency/access and mounts
 * `DashboardLayout` with `activeContext` set, which makes the sidebar expand
 * this emergency's gated sections inline (see `navigation.ts`
 * `emergencySectionItems`). Sections live in the sidebar now, so — unlike the
 * legacy `coordinacion` layout — this does NOT render `CoordinationTabs`.
 */
export default async function ManageLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const returnPath = `/emergencies/${slug}/manage`;
  const { emergency, access } = await resolveManageAccess(slug, returnPath);
  const roles = await getRoles();

  const { t } = await getT();
  const tc = t.coord;
  const roleDesc = new Map(roles.map((r) => [r.id, r.description ?? r.id]));

  return (
    <DashboardLayout
      activeContext={{ type: 'emergency', id: emergency.id }}
      activeEmergencyAccess={access}
    >
      <main className="flex-1 bg-surface">
        <PageContainer>
          <ContextSwitcher
            ariaLabel={t.nav.breadcrumb}
            items={[{ label: t.nav.home, href: '/dashboard' }, { label: emergency.name }]}
          />
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
          {children}
        </PageContainer>
      </main>
    </DashboardLayout>
  );
}
