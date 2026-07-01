import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { loginHref } from '@/lib/auth';
import { getMe } from '@/lib/navigation-data';
import { DashboardLayout } from '@/lib/dashboard-layout';
import { PageContainer } from '@/components/molecules/page-container';

/**
 * Platform-administration shell: resolves the session and mounts
 * `DashboardLayout` with the `admin` active context, which makes the sidebar
 * expand the admin sections inline (see `navigation.ts` `adminSectionItems`).
 * Sections live in the sidebar now, so — unlike the legacy `administracion`
 * layout — this does NOT render `AdminTabs`.
 *
 * Gate here is just "authenticated" — the individual admin pages already do
 * their own permission checks (platform-admin-only vs. scope-administrable),
 * so this layout doesn't need to resolve grants.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  if (me == null) redirect(loginHref('/admin'));

  return (
    <DashboardLayout activeContext={{ type: 'admin', id: 'platform' }}>
      <main className="flex-1 bg-surface">
        <PageContainer>{children}</PageContainer>
      </main>
    </DashboardLayout>
  );
}
