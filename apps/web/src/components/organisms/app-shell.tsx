/**
 * AppShell — the responsive dashboard chrome for authenticated/role areas.
 * Persistent navy sidebar at lg+, a hamburger drawer below that. Server
 * component: it only lays out and renders the client nav/drawer/account
 * islands, receiving an already-resolved nav model (plain strings) as props.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { AccountMenu } from '@/components/molecules/account-menu';
import { NavGroup, type ResolvedNavGroup } from '@/components/molecules/nav-group';
import { NavDrawer } from '@/components/molecules/nav-drawer';

interface AppShellProps {
  groups: ResolvedNavGroup[];
  user: { name: string; email: string; isAdmin: boolean };
  accountLabels: { admin: string; logout: string };
  chrome: { openMenu: string; closeMenu: string; navAria: string };
  emergencyContext?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  groups,
  user,
  accountLabels,
  chrome,
  emergencyContext,
  children,
}: AppShellProps) {
  const brand = (
    <Link
      href="/panel"
      className="inline-flex text-white focus:outline-none focus:ring-2 focus:ring-white rounded"
    >
      <BrandLogo wordmarkClassName="text-base text-white" />
    </Link>
  );

  const navGroups = (
    <div className="flex flex-col gap-1 pb-2">
      {groups.map((g) => (
        <NavGroup key={g.key} group={g} />
      ))}
    </div>
  );

  const account = (
    <AccountMenu
      name={user.name}
      email={user.email}
      isAdmin={user.isAdmin}
      adminLabel={accountLabels.admin}
      logoutLabel={accountLabels.logout}
    />
  );

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden bg-navy lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="px-4 py-4">{brand}</div>
        <nav aria-label={chrome.navAria} className="flex-1 overflow-y-auto px-2">
          {navGroups}
        </nav>
        <div className="pb-4">{account}</div>
      </aside>

      {/* Mobile top bar + slide-in drawer */}
      <NavDrawer
        brand={brand}
        account={account}
        openLabel={chrome.openMenu}
        closeLabel={chrome.closeMenu}
        navAriaLabel={chrome.navAria}
      >
        {navGroups}
      </NavDrawer>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {emergencyContext}
        {children}
      </div>
    </div>
  );
}
