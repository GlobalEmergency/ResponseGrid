import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';
import { ProfileForm } from './ProfileForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.miPerfil.meta_title,
    description: t.miPerfil.meta_description,
  };
}

export default async function MiPerfilPage() {
  const token = await getToken();
  if (token === null) redirect('/login?next=/panel/mi-perfil');

  const { t } = await getT();
  const tm = t.miPerfil;

  const { data: me } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (me === undefined) redirect('/login?next=/panel/mi-perfil');

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader title={tm.page_title} subtitle={tm.page_subtitle} />
        <ProfileForm initialName={me.name} initialPhone={me.phone} />
      </PageContainer>
    </main>
  );
}
