import { scopeLabel } from '@/lib/permissions';
import type { EffectiveScopePermissions } from '@/lib/effective-permissions';

/**
 * Renders a service account's resolved permissions grouped by scope. Shared by
 * the platform API-key detail page and the org-scoped service-accounts manager
 * so both surfaces stay identical. Permissions are shown at the scope where they
 * were granted; a note reminds the reader that a broader scope (e.g. platform)
 * also applies to every narrower scope beneath it.
 */
export function EffectivePermissions({
  effective,
}: {
  effective: EffectiveScopePermissions[];
}) {
  if (effective.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">Permisos efectivos</h3>
      <p className="text-xs text-muted">
        Agrupados por el ámbito en que se concedieron. Un ámbito superior (p. ej.
        Plataforma) aplica también a todos los ámbitos inferiores.
      </p>
      <ul className="flex flex-col gap-3" role="list">
        {effective.map((scope) => (
          <li
            key={`${scope.scopeType}:${scope.scopeId ?? ''}`}
            className="flex flex-col gap-1"
          >
            <span className="text-xs font-semibold text-muted">
              {scopeLabel(scope.scopeType, scope.scopeId)}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scope.permissions.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 font-mono text-xs text-ink-soft"
                >
                  {p}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
