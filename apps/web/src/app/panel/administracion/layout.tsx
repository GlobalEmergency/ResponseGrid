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
