import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/molecules/page-header';
import { getT } from '@/i18n/server';
import { fetchUsers } from './actions';
import { UsersList } from './users-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.admin.users_meta_title,
    description: t.admin.users_meta_description,
  };
}

export default async function UsuariosPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/usuarios');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/panel/administracion/usuarios');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  const users = await fetchUsers();

  const { t } = await getT();
  const ta = t.admin;

  return (
    <>
      <PageHeader title={ta.users_title} subtitle={ta.users_subtitle} />
      <UsersList users={users} ta={ta} />
    </>
  );
}
