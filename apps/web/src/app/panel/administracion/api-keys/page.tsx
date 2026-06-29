import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchServiceAccounts } from './actions';
import { CreateServiceAccountForm } from './create-sa-form';
import { shortId } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'API keys — Admin · ResponseGrid',
  description: 'Cuentas de servicio y claves de API (principales máquina).',
};

export default async function ApiKeysPage() {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/api-keys');

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) redirect('/login?next=/panel/administracion/api-keys');
  if (!me.isAdmin) redirect('/');

  const accounts = await fetchServiceAccounts();

  return (
    <>
      <PageHeader title="Cuentas de servicio y API keys" />
      <p className="text-base text-muted">
        Principales máquina: cuentas de servicio que se autentican por API
        key (cabecera <code className="font-mono text-sm">X-API-Key</code>).
        Solo administradores.
      </p>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">
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
                  href={`/panel/administracion/api-keys/${sa.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-surface"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-ink">
                      {sa.name}
                    </span>
                    <span className="text-xs text-muted">
                      {sa.ownerOrganizationId
                        ? `Org · ${shortId(sa.ownerOrganizationId)}`
                        : 'Plataforma'}
                    </span>
                  </div>
                  <span className="flex-shrink-0 text-sm text-muted">
                    Gestionar claves →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="border-line" />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">
          Crear cuenta de servicio
        </h2>
        <CreateServiceAccountForm />
      </section>
    </>
  );
}
