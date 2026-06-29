import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/molecules/page-header';
import { getT } from '@/i18n/server';
import { fetchAdminResources } from './actions';
import { CentrosList } from './centros-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.admin.centros_meta_title,
    description: t.admin.centros_meta_description,
  };
}

export default async function CentrosPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/centros');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/panel/administracion/centros');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  const resources = await fetchAdminResources();

  const { t } = await getT();
  const ta = t.admin;

  return (
    <>
      <PageHeader title={ta.centros_title} subtitle={ta.centros_subtitle} />
      <CentrosList resources={resources} ta={ta} />
    </>
  );
}
