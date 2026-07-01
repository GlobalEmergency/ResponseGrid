import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getT } from '@/i18n/server';
import { getNavContext } from '@/lib/navigation-data';
import { buildNavModel, type NavItem, type ActiveContextRef } from '@/lib/navigation';
import { canAdminister, type MeGrant, type RoleCatalogEntry } from '@/lib/admin-scopes';
import type { EmergencyAccess } from '@/lib/emergency-permissions';
import { AppShell } from '@/components/organisms/app-shell';
import type { ResolvedNavGroup } from '@/components/molecules/nav-group';
import type { ResolvedNavItem } from '@/components/atoms/nav-item';

export async function DashboardLayout({
  children,
  emergencyContext,
  activeContext,
  activeEmergencyAccess,
}: {
  children: ReactNode;
  emergencyContext?: ReactNode;
  activeContext?: ActiveContextRef;
  activeEmergencyAccess?: EmergencyAccess;
}) {
  const { me, roles, notificationUnread, contexts } = await getNavContext();
  if (me == null) redirect('/login');

  const { t } = await getT();
  const tn = t.nav;

  const grants = (me.grants ?? []) as MeGrant[];
  const roleCatalog = roles as RoleCatalogEntry[];

  const model = buildNavModel({
    contexts,
    isAdmin: me.isAdmin === true,
    canAdminister: canAdminister(grants, roleCatalog),
    notificationUnread,
    activeContext,
    activeEmergencyAccess,
  });

  const resolveItem = (it: NavItem): ResolvedNavItem => ({
    key: it.key,
    href: it.href,
    label: it.label ?? (it.labelKey != null ? tn[it.labelKey] : ''),
    badgeCount: it.badgeCount,
    exact: it.exact,
    children: it.children?.map(resolveItem),
  });

  const groups: ResolvedNavGroup[] = model.map((g) => ({
    key: g.key,
    heading: g.headingKey != null ? tn[g.headingKey] : undefined,
    items: g.items.map(resolveItem),
  }));

  return (
    <AppShell
      groups={groups}
      user={{ name: me.name, email: me.email, isAdmin: me.isAdmin === true }}
      accountLabels={{ admin: tn.admin_chip, logout: tn.logout }}
      chrome={{ openMenu: tn.open_menu, closeMenu: tn.close_menu, navAria: tn.nav_aria }}
      emergencyContext={emergencyContext}
    >
      {children}
    </AppShell>
  );
}
