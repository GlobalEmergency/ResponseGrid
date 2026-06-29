import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { CreateOrgForm } from './create-org-form';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.organizaciones.meta_title,
    description: t.organizaciones.meta_description,
  };
}

export default async function OrganizacionesPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/organizaciones');
  }

  const { data: orgs } = await api.GET('/organizations/mine', {
    headers: authHeaders(token),
  });

  const myOrgs = orgs ?? [];
  const { t } = await getT();
  const to = t.organizaciones;

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader title={to.title} subtitle={to.subtitle} />

        {/* Org list */}
        <section aria-labelledby="orgs-heading" className="flex flex-col gap-4">
          <h2 id="orgs-heading" className="text-xl font-bold text-ink">
            {to.list_heading} ({myOrgs.length})
          </h2>

          {myOrgs.length === 0 ? (
            <EmptyState title={to.empty_title} description={to.empty_description} />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {myOrgs.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/panel/organizaciones/${org.id}`}
                    className="flex flex-col gap-1 rounded-lg border border-line bg-white p-5 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
                  >
                    <span className="text-lg font-bold text-ink">{org.name}</span>
                    <span className="text-sm text-muted uppercase tracking-wide font-medium">
                      {org.type} · {org.verificationLevel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create org form */}
        <section aria-labelledby="create-org-heading" className="flex flex-col gap-4">
          <h2 id="create-org-heading" className="text-xl font-bold text-ink">
            {to.create_heading}
          </h2>
          <CreateOrgForm />
        </section>
      </PageContainer>
    </main>
  );
}
