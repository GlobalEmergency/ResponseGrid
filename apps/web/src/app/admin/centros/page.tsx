import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
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
    redirect('/login?next=/admin/centros');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/admin/centros');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  const resources = await fetchAdminResources();

  const { t } = await getT();
  const ta = t.admin;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/administracion"
          backLabel={ta.centros_back}
          title={ta.centros_title}
          subtitle={ta.centros_subtitle}
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">
          <CentrosList resources={resources} ta={ta} />
        </div>
      </div>
    </main>
  );
}
