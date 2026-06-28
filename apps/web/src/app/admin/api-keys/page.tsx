import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchServiceAccounts } from './actions';
import { CreateServiceAccountForm } from './create-sa-form';
import { shortId } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'API keys — Admin · ResponseGrid',
  description: 'Cuentas de servicio y claves de API (principales máquina).',
};

export default async function ApiKeysPage() {
  const token = await getToken();
  if (!token) redirect('/login?next=/admin/api-keys');

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) redirect('/login?next=/admin/api-keys');
  if (!me.isAdmin) redirect('/');

  const accounts = await fetchServiceAccounts();

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Inicio
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Cuentas de servicio y API keys
          </h1>
          <p className="text-base text-gray-600">
            Principales máquina: cuentas de servicio que se autentican por API
            key (cabecera <code className="font-mono text-sm">X-API-Key</code>).
            Solo administradores.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Cuentas de servicio ({accounts.length})
          </h2>

          {accounts.length === 0 ? (
            <EmptyState
              title="No hay cuentas de servicio."
              description="Crea una abajo para emitir su primera clave."
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {accounts.map((sa) => (
                <li key={sa.id}>
                  <Link
                    href={`/admin/api-keys/${sa.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-900 bg-white p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-gray-900">
                        {sa.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sa.ownerOrganizationId
                          ? `Org · ${shortId(sa.ownerOrganizationId)}`
                          : 'Plataforma'}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-sm text-gray-400">
                      Gestionar claves →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-gray-200" />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Crear cuenta de servicio
          </h2>
          <CreateServiceAccountForm />
        </section>
      </div>
    </main>
  );
}
