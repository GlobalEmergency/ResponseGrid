import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchServiceAccounts, fetchApiKeys } from '../actions';
import { IssueKeyButton } from '../issue-key-button';
import { RevokeKeyButton } from '../revoke-key-button';
import { shortId } from '@/lib/permissions';
import { formatDate } from '@/lib/format-date';
import { PageHeader } from '@/components/molecules/page-header';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cuenta de servicio — Admin · ResponseGrid',
};

type Props = { params: Promise<{ id: string }> };

export default async function ServiceAccountDetailPage({ params }: Props) {
  const { id } = await params;

  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/administracion/api-keys/${id}`);

  const { data: me, response: meRes } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meRes.status === 401 || !me) redirect(`/login?next=/panel/administracion/api-keys/${id}`);
  if (!me.isAdmin) redirect('/');

  const [accounts, keys] = await Promise.all([
    fetchServiceAccounts(),
    fetchApiKeys(id),
  ]);
  const sa = accounts.find((a) => a.id === id);
  if (!sa) notFound();

  return (
    <>
      <PageHeader
        title={sa.name}
        subtitle={
          sa.ownerOrganizationId
            ? `Organización · ${shortId(sa.ownerOrganizationId)}`
            : 'Ámbito plataforma'
        }
        backHref="/panel/administracion/api-keys"
        backLabel="Cuentas de servicio"
      />
      <p className="text-xs text-muted break-all">ID: {sa.id}</p>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">Claves ({keys.length})</h2>
        {keys.length === 0 ? (
          <EmptyState title="Esta cuenta no tiene claves todavía." />
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-sm text-ink">
                    {k.prefix}…
                  </span>
                  <span className="text-xs text-muted">
                    Creada{' '}
                    <time dateTime={k.createdAt} suppressHydrationWarning>
                      {formatDate(k.createdAt, 'es')}
                    </time>
                    {k.lastUsedAt &&
                      ` · uso ${formatDate(k.lastUsedAt, 'es')}`}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      k.active
                        ? 'border-green-400 bg-green-50 text-green-800'
                        : 'border-line bg-surface text-muted'
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

      <hr className="border-line" />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Emitir clave</h2>
        <p className="text-xs text-muted">
          La clave se muestra una sola vez. Guárdala en un gestor de secretos.
        </p>
        <IssueKeyButton serviceAccountId={id} />
      </section>
    </>
  );
}
