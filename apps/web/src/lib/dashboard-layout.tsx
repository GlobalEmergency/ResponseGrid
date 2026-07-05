import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { redirectToLogin } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { getNavContext } from '@/lib/navigation-data';
import { buildNavModel, type NavItem } from '@/lib/navigation';
import { canAdminister, type MeGrant, type RoleCatalogEntry } from '@/lib/admin-scopes';
import { resolveEmergencyAccess, type EmergencyAccess } from '@/lib/emergency-permissions';
import { AppShell } from '@/components/organisms/app-shell';
import type { ResolvedNavGroup } from '@/components/molecules/nav-group';
import type { ResolvedNavItem } from '@/components/atoms/nav-item';

export async function DashboardLayout({
  children,
  emergencyContext,
}: {
  children: ReactNode;
  emergencyContext?: ReactNode;
}) {
  const { me, roles, notificationUnread, contexts } = await getNavContext();
  if (me == null) return redirectToLogin();
  // Force onboarding for any incomplete profile (missing phone/consent or an
  // outdated consent version) before granting access to the panel.
  if (me.profileComplete === false) redirect('/auth/onboarding?next=/dashboard');

  const { t } = await getT();
  const tn = t.nav;

  const grants = (me.grants ?? []) as MeGrant[];
  const roleCatalog = roles as RoleCatalogEntry[];

  // Resolve each emergency context's access once, keyed by id, so the model can
  // nest every emergency's gated sections (not just the active route's).
  const emergencyAccessById: Record<string, EmergencyAccess> = {};
  for (const ctx of contexts) {
    if (ctx.type === 'emergency') {
      emergencyAccessById[ctx.id] = resolveEmergencyAccess(ctx.id, grants, roleCatalog);
    }
  }

  const model = buildNavModel({
    contexts,
    isAdmin: me.isAdmin === true,
    canAdminister: canAdminister(grants, roleCatalog),
    notificationUnread,
    emergencyAccessById,
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
      chrome={{ openMenu: tn.open_menu, closeMenu: tn.close_menu, navAria: tn.nav_aria, toggleSection: tn.toggle_section }}
      emergencyContext={emergencyContext}
    >
      {children}
    </AppShell>
  );
}
