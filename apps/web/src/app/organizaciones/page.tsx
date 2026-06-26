import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { CreateOrgForm } from './create-org-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis organizaciones — ReliefHub',
  description: 'Gestión de organizaciones en ReliefHub.',
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
    <main className="min-h-screen flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Inicio
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Mis organizaciones
          </h1>
          <p className="text-base text-gray-600">
            Organizaciones a las que perteneces.
          </p>
        </header>

        {/* Org list */}
        <section aria-labelledby="orgs-heading" className="flex flex-col gap-4">
          <h2 id="orgs-heading" className="text-xl font-bold text-gray-900">
            Organizaciones ({myOrgs.length})
          </h2>

          {myOrgs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center">
              <p className="text-base font-semibold text-gray-700">
                Aún no perteneces a ninguna organización.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Crea una a continuación o pide que te añadan a una existente.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {myOrgs.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/organizaciones/${org.id}`}
                    className="flex flex-col gap-1 rounded-lg border-2 border-gray-900 bg-white p-5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
                  >
                    <span className="text-lg font-bold text-gray-900">{org.name}</span>
                    <span className="text-sm text-gray-500 uppercase tracking-wide font-medium">
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
          <h2 id="create-org-heading" className="text-xl font-bold text-gray-900">
            Crear organización
          </h2>
          <CreateOrgForm />
        </section>

      </div>
    </main>
  );
}
