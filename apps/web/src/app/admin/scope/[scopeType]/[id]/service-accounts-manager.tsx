'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Badge } from '@/components/atoms/badge';
import { ErrorMessage } from '@/components/atoms/error-message';
import { EmptyState } from '@/components/molecules/empty-state';
import { EffectivePermissions } from '@/components/molecules/effective-permissions';
import { formatDate } from '@/lib/format-date';
import { scopeLabel, scopeTypeLabel, GRANTABLE_SCOPE_TYPES } from '@/lib/permissions';
import { computeEffectivePermissions } from '@/lib/effective-permissions';
import {
  fetchOrgServiceAccounts,
  fetchApiKeys,
  fetchServiceAccountGrants,
  createServiceAccountAction,
  issueApiKeyAction,
  revokeApiKeyAction,
  grantServiceAccountRoleAction,
  revokeServiceAccountGrantAction,
  type ServiceAccountView,
  type ApiKeyView,
  type ServiceAccountGrantView,
  type RoleView,
} from './actions';

export function ServiceAccountsManager({
  orgId,
  initialAccounts,
  roles,
}: {
  orgId: string;
  initialAccounts: ServiceAccountView[];
  roles: RoleView[];
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
              <ServiceAccountKeys saId={sa.id} name={sa.name} roles={roles} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="sa-name"
            className="mb-1 block text-sm font-semibold text-ink"
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

function ServiceAccountKeys({
  saId,
  name,
  roles,
}: {
  saId: string;
  name: string;
  roles: RoleView[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKeyView[] | null>(null);
  const [grants, setGrants] = useState<ServiceAccountGrantView[] | null>(null);
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
      const [nextKeys, nextGrants] = await Promise.all([
        fetchApiKeys(saId),
        fetchServiceAccountGrants(saId),
      ]);
      setKeys(nextKeys);
      setGrants(nextGrants);
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

  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState('organization');
  const [scopeId, setScopeId] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');

  function handleGrant() {
    setError(null);
    startTransition(async () => {
      const result = await grantServiceAccountRoleAction(
        saId,
        roleId,
        scopeType,
        scopeId,
        grantExpiresAt,
      );
      if (result.status === 'success') {
        setRoleId('');
        setScopeId('');
        setGrantExpiresAt('');
        setGrants(await fetchServiceAccountGrants(saId));
        // The page's server-rendered "Roles concedidos" list also shows this
        // service account's grants — refresh it so the two lists don't disagree.
        router.refresh();
      } else if (result.status === 'error') {
        setError(result.message);
      }
    });
  }

  function handleRevokeGrant(grantId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeServiceAccountGrantAction(grantId);
      if (result.status === 'success') {
        setGrants(await fetchServiceAccountGrants(saId));
        router.refresh();
      } else if (result.status === 'error') {
        setError(result.message);
      }
    });
  }

  const effective = grants ? computeEffectivePermissions(grants, roles) : [];

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-ink">{name}</span>
          <span className="font-mono text-xs text-muted-soft break-all">{saId}</span>
        </span>
        <span className="flex-shrink-0 text-sm text-muted">
          {open ? 'Ocultar claves' : 'Gestionar claves'}
        </span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {error && <ErrorMessage message={error} />}
          {secret && (
            <div className="flex flex-col gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-900">
                Copia esta clave ahora — no se volverá a mostrar.
              </p>
              <code className="block w-full overflow-x-auto rounded bg-white px-3 py-2 font-mono text-sm text-ink select-all break-all">
                {secret}
              </code>
            </div>
          )}

          {keys === null ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted">Sin claves emitidas.</p>
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2"
                >
                  <span className="font-mono text-xs text-ink-soft break-all">
                    {k.prefix}…
                    <span className="ml-1 text-muted-soft">
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

          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-ink">Permisos</span>
              <span className="text-xs text-muted">
                Sus claves heredan estos roles. Sin permisos, solo leen datos
                públicos.
              </span>
            </div>

            {grants === null ? (
              <p className="text-sm text-muted">Cargando…</p>
            ) : grants.length === 0 ? (
              <p className="text-sm text-muted">Sin permisos concedidos.</p>
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {grants.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2"
                  >
                    <span className="text-xs text-ink-soft">
                      <span className="font-mono">{g.roleId}</span>
                      {' · '}
                      {scopeLabel(g.scopeType, g.scopeId)}
                    </span>
                    <Button
                      type="button"
                      variant="danger-outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleRevokeGrant(g.id)}
                    >
                      Revocar
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <EffectivePermissions effective={effective} />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink">
                Rol
                <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="" disabled>
                    Elige un rol…
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
                Ámbito
                <Select
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value)}
                >
                  {GRANTABLE_SCOPE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {scopeTypeLabel(s)}
                    </option>
                  ))}
                </Select>
              </label>
              {scopeType !== 'platform' && (
                <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink">
                  ID de {scopeTypeLabel(scopeType)}
                  <Input
                    type="text"
                    placeholder="UUID"
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    autoComplete="off"
                  />
                </label>
              )}
              <Button
                type="button"
                size="sm"
                disabled={pending || !roleId}
                onClick={handleGrant}
              >
                {pending ? 'Concediendo…' : 'Conceder'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
