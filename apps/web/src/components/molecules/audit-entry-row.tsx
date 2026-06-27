import { StatusCodeBadge } from '@/components/atoms/status-code-badge';
import type { AuditEntryDto } from '@/app/admin/auditoria/actions';

interface AuditEntryRowProps {
  entry: AuditEntryDto;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function resolveOptional(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * AuditEntryCard — mobile card variant (renders as <li>).
 */
export function AuditEntryCard({ entry }: AuditEntryRowProps) {
  const actor = resolveOptional(entry.actorUserId) ?? '—';
  const entityType = resolveOptional(entry.entityType);
  const entityId = resolveOptional(entry.entityId);
  const entityLabel =
    entityType != null
      ? entityId != null
        ? `${entityType} / ${entityId}`
        : entityType
      : '—';

  return (
    <li className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-gray-900 break-all">
          {entry.action}
        </span>
        <StatusCodeBadge code={entry.statusCode} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
        <span>
          Actor:{' '}
          <span className="font-medium break-all">{actor}</span>
        </span>
        <span>
          Entidad:{' '}
          <span className="font-medium break-all">{entityLabel}</span>
        </span>
      </div>
      <div className="text-xs text-gray-500 font-mono break-all">
        {entry.method} {entry.path}
      </div>
      <time
        dateTime={entry.createdAt}
        className="text-xs text-gray-400"
        suppressHydrationWarning
      >
        {formatDate(entry.createdAt)}
      </time>
    </li>
  );
}

/**
 * AuditEntryRow — desktop table-row variant (renders as <tr>).
 */
export function AuditEntryRow({ entry }: AuditEntryRowProps) {
  const actor = resolveOptional(entry.actorUserId) ?? '—';
  const entityType = resolveOptional(entry.entityType);
  const entityId = resolveOptional(entry.entityId);
  const entityLabel =
    entityType != null
      ? entityId != null
        ? `${entityType} / ${entityId}`
        : entityType
      : '—';

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 text-sm font-bold text-gray-900 break-all">
        {entry.action}
      </td>
      <td className="py-3 px-4 text-xs text-gray-600 break-all max-w-[12rem]">
        {actor}
      </td>
      <td className="py-3 px-4 text-xs text-gray-600 break-all max-w-[14rem]">
        {entityLabel}
      </td>
      <td className="py-3 px-4 text-xs font-mono text-gray-500 break-all max-w-[16rem]">
        {entry.method} {entry.path}
      </td>
      <td className="py-3 px-4">
        <StatusCodeBadge code={entry.statusCode} />
      </td>
      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
        <time
          dateTime={entry.createdAt}
          suppressHydrationWarning
        >
          {formatDate(entry.createdAt)}
        </time>
      </td>
    </tr>
  );
}
