import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchServiceAccounts, fetchApiKeys } from '../actions';
import { IssueKeyButton } from '../issue-key-button';
import { RevokeKeyButton } from '../revoke-key-button';
import { shortId } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cuenta de servicio — Admin · ResponseGrid',
};

type Props = { params: Promise<{ id: string }> };

export default async function ServiceAccountDetailPage({ params }: Props) {
  const { id } = await params;

  const token = await getToken();
  if (!token) redirect(`/login?next=/admin/api-keys/${id}`);

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) redirect(`/login?next=/admin/api-keys/${id}`);
  if (!me.isAdmin) redirect('/');

  const [accounts, keys] = await Promise.all([
    fetchServiceAccounts(),
    fetchApiKeys(id),
  ]);
  const sa = accounts.find((a) => a.id === id);
  if (!sa) notFound();

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            href="/admin/api-keys"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Cuentas de servicio
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {sa.name}
          </h1>
          <span className="text-sm text-gray-600">
            {sa.ownerOrganizationId
              ? `Organización · ${shortId(sa.ownerOrganizationId)}`
              : 'Ámbito plataforma'}
          </span>
          <span className="text-xs text-gray-400 break-all">ID: {sa.id}</span>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Claves ({keys.length})
          </h2>
          {keys.length === 0 ? (
            <EmptyState title="Esta cuenta no tiene claves todavía." />
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-mono text-sm text-gray-900">
                      {k.prefix}…
                    </span>
                    <span className="text-xs text-gray-500">
                      Creada{' '}
                      {new Date(k.createdAt).toLocaleDateString('es-ES')}
                      {k.lastUsedAt &&
                        ` · uso ${new Date(k.lastUsedAt).toLocaleDateString('es-ES')}`}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        k.active
                          ? 'border-green-400 bg-green-50 text-green-800'
                          : 'border-gray-300 bg-gray-100 text-gray-500'
                      }`}
                    >
                      {k.active ? 'Activa' : 'Revocada'}
                    </span>
                    {k.active && (
                      <RevokeKeyButton keyId={k.id} serviceAccountId={id} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-gray-200" />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-gray-900">Emitir clave</h2>
          <p className="text-xs text-gray-500">
            La clave se muestra una sola vez. Guárdala en un gestor de secretos.
          </p>
          <IssueKeyButton serviceAccountId={id} />
        </section>
      </div>
    </main>
  );
}
