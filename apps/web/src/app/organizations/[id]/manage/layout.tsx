import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { loginHref, clearToken } from '@/lib/auth';
import { getMe } from '@/lib/navigation-data';
import { DashboardLayout } from '@/lib/dashboard-layout';

/**
 * Organization workspace shell: resolves session/`me` and mounts
 * `DashboardLayout`. The org UI today is member management only, so this is
 * a single workspace page — no gated sub-sections to inline like the
 * emergency `manage` layout. The page renders its own `<main>`/`PageContainer`.
 */
export default async function OrganizationManageLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getMe();
  if (me == null) {
    await clearToken();
    redirect(loginHref(`/organizations/${id}/manage`));
  }

  return (
    <DashboardLayout activeContext={{ type: 'organization', id }}>
      {children}
    </DashboardLayout>
  );
}
