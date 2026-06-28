import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { CreateOrgForm } from './create-org-form';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis organizaciones — ResponseGrid',
  description: 'Gestión de organizaciones en ResponseGrid.',
};

export default async function OrganizacionesPage() {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/organizaciones');
  }

  const { data: orgs } = await api.GET('/organizations/mine', {
    headers: authHeaders(token),
  });

  const myOrgs = orgs ?? [];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/"
          backLabel="← Inicio"
          title="Mis organizaciones"
          subtitle="Organizaciones a las que perteneces."
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        {/* Org list */}
        <section aria-labelledby="orgs-heading" className="flex flex-col gap-4">
          <h2 id="orgs-heading" className="text-xl font-bold text-ink">
            Organizaciones ({myOrgs.length})
          </h2>

          {myOrgs.length === 0 ? (
            <EmptyState
              title="Aún no perteneces a ninguna organización."
              description="Crea una a continuación o pide que te añadan a una existente."
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {myOrgs.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/organizaciones/${org.id}`}
                    className="flex flex-col gap-1 rounded-lg border-2 border-navy bg-white p-5 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
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
            Crear organización
          </h2>
          <CreateOrgForm />
        </section>

        </div>
      </div>
    </main>
  );
}
