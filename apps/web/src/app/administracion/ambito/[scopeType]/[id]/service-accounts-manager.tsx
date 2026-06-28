'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Badge } from '@/components/atoms/badge';
import { ErrorMessage } from '@/components/atoms/error-message';
import { EmptyState } from '@/components/molecules/empty-state';
import { formatDate } from '@/lib/format-date';
import {
  fetchOrgServiceAccounts,
  fetchApiKeys,
  createServiceAccountAction,
  issueApiKeyAction,
  revokeApiKeyAction,
  type ServiceAccountView,
  type ApiKeyView,
} from './actions';

export function ServiceAccountsManager({
  orgId,
  initialAccounts,
}: {
  orgId: string;
  initialAccounts: ServiceAccountView[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createServiceAccountAction(orgId, name);
      if (result.status === 'success') {
        setName('');
        setAccounts(await fetchOrgServiceAccounts(orgId));
      } else if (result.status === 'error') {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorMessage message={error} />}

      {accounts.length === 0 ? (
        <EmptyState
          title="No hay cuentas de servicio en esta organización."
          description="Crea la primera abajo."
        />
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {accounts.map((sa) => (
            <li key={sa.id}>
              <ServiceAccountKeys saId={sa.id} name={sa.name} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="sa-name"
            className="mb-1 block text-sm font-semibold text-gray-900"
          >
            Nueva cuenta de servicio
          </label>
          <Input
            id="sa-name"
            type="text"
            placeholder="p. ej. Integración logística"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="md"
          disabled={pending || !name.trim()}
          onClick={handleCreate}
        >
          {pending ? 'Creando…' : 'Crear'}
        </Button>
      </div>
    </div>
  );
}

function ServiceAccountKeys({ saId, name }: { saId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKeyView[] | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && keys === null) refresh();
  }

  function refresh() {
    startTransition(async () => {
      setKeys(await fetchApiKeys(saId));
    });
  }

  function handleIssue() {
    setError(null);
    setSecret(null);
    startTransition(async () => {
      const result = await issueApiKeyAction(saId);
      if (result.status === 'success') {
        setSecret(result.apiKey);
        setKeys(await fetchApiKeys(saId));
      } else if (result.status === 'error') {
        setError(result.message);
      }
    });
  }

  function handleRevoke(keyId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeApiKeyAction(keyId);
      if (result.status === 'success') {
        setKeys(await fetchApiKeys(saId));
      } else if (result.status === 'error') {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-lg border-2 border-gray-900 bg-white p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-gray-900">{name}</span>
          <span className="font-mono text-xs text-gray-400 break-all">{saId}</span>
        </span>
        <span className="flex-shrink-0 text-sm text-gray-500">
          {open ? 'Ocultar claves' : 'Gestionar claves'}
        </span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4">
          {error && <ErrorMessage message={error} />}
          {secret && (
            <div className="flex flex-col gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-900">
                Copia esta clave ahora — no se volverá a mostrar.
              </p>
              <code className="block w-full overflow-x-auto rounded bg-white px-3 py-2 font-mono text-sm text-gray-900 select-all break-all">
                {secret}
              </code>
            </div>
          )}

          {keys === null ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-gray-500">Sin claves emitidas.</p>
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2"
                >
                  <span className="font-mono text-xs text-gray-700 break-all">
                    {k.prefix}…
                    <span className="ml-1 text-gray-400">
                      {k.lastUsedAt
                        ? `· último uso ${formatDate(k.lastUsedAt, 'es')}`
                        : '· sin uso'}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={k.active ? 'role-owner' : 'role-member'}>
                      {k.revokedAt ? 'Revocada' : k.active ? 'Activa' : 'Caducada'}
                    </Badge>
                    {k.active && (
                      <Button
                        type="button"
                        variant="danger-outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleRevoke(k.id)}
                      >
                        Revocar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={handleIssue}
            >
              {pending ? 'Emitiendo…' : 'Emitir nueva clave'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
