/**
 * DashboardLayout — shared server layout for authenticated/role areas. Loads the
 * nav context (cached), redirects anonymous users to /login, builds + resolves
 * the role-aware menu and renders the AppShell around the page. Section layouts
 * delegate to this; the coordinación layout passes an emergencyContext banner.
 */
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getT } from '@/i18n/server';
import { getNavContext } from '@/lib/navigation-data';
import { buildNavModel } from '@/lib/navigation';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { AppShell } from '@/components/organisms/app-shell';
import type { ResolvedNavGroup } from '@/components/molecules/nav-group';

export async function DashboardLayout({
  children,
  emergencyContext,
}: {
  children: ReactNode;
  emergencyContext?: ReactNode;
}) {
  const { me, roles, myEmergencies, notificationUnread } = await getNavContext();
  if (me == null) redirect('/login');

  const { t } = await getT();
  const tn = t.nav;

  const model = buildNavModel({
    grants: (me.grants ?? []) as MeGrant[],
    roles: roles as RoleCatalogEntry[],
    isAdmin: me.isAdmin === true,
    myEmergencies,
    notificationUnread,
  });

  const groups: ResolvedNavGroup[] = model.map((g) => ({
    key: g.key,
    heading: g.headingKey != null ? tn[g.headingKey] : undefined,
    items: g.items.map((it) => ({
      key: it.key,
      href: it.href,
      label: it.label ?? (it.labelKey != null ? tn[it.labelKey] : ''),
      badgeCount: it.badgeCount,
      exact: it.exact,
    })),
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
