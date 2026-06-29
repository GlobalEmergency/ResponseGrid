import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/molecules/page-header';
import { getT } from '@/i18n/server';
import { fetchOrganizations } from './actions';
import { OrganizationsList } from './organizations-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.admin.orgs_meta_title,
    description: t.admin.orgs_meta_description,
  };
}

export default async function OrganizacionesPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/organizaciones');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/panel/administracion/organizaciones');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  const organizations = await fetchOrganizations();

  const { t } = await getT();
  const ta = t.admin;

  return (
    <>
      <PageHeader title={ta.orgs_title} subtitle={ta.orgs_subtitle} />
      <OrganizationsList organizations={organizations} ta={ta} />
    </>
  );
}
