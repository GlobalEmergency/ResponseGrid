/**
 * Administration shell. Sits inside the dashboard chrome (panel/layout.tsx →
 * DashboardLayout) and frames every admin tool with a single wide container and
 * the permission-aware AdminTabs sub-nav. Each tool page owns its own PageHeader
 * (title + optional back link/actions) and renders its section(s) below —
 * mirroring the coordination area.
 */
import type { ReactNode } from 'react';
import { getMe } from '@/lib/navigation-data';
import { PageContainer } from '@/components/molecules/page-container';
import { AdminTabs } from '@/components/organisms/admin-tabs';

export default async function AdministracionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const isPlatformAdmin = me?.isAdmin === true;

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <AdminTabs isPlatformAdmin={isPlatformAdmin} />
        {children}
      </PageContainer>
    </main>
  );
}
