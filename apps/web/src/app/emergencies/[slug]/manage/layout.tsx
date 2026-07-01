import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { requireSession, loginHref, clearToken } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { DashboardLayout } from '@/lib/dashboard-layout';
import { ContextSwitcher } from '@/components/molecules/context-switcher';
import { PageContainer } from '@/components/molecules/page-container';

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

  await requireSession(`/emergencies/${slug}/manage`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(loginHref(`/emergencies/${slug}/manage`));
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergency.id,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  const { t } = await getT();

  return (
    <DashboardLayout
      activeContext={{ type: 'emergency', id: emergency.id }}
      activeEmergencyAccess={access}
    >
      <main className="flex-1 bg-surface">
        <PageContainer>
          <ContextSwitcher
            items={[{ label: t.nav.home, href: '/dashboard' }, { label: emergency.name }]}
          />
          {children}
        </PageContainer>
      </main>
    </DashboardLayout>
  );
}
