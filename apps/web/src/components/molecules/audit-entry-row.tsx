import { StatusCodeBadge } from '@/components/atoms/status-code-badge';
import type { AuditEntryDto } from '@/app/admin/auditoria/actions';
import { formatDate as formatDateUtc } from '@/lib/format-date';
import { getT } from '@/i18n/server';

interface AuditEntryRowProps {
  entry: AuditEntryDto;
}

/**
 * Audit timestamp: "26 jun 2026, 14:32". Pinned to UTC via the shared helper so
 * the server (UTC) and browser (local) agree — no #418 mismatch (issue #174).
 */
function formatDate(iso: string): string {
  return formatDateUtc(iso, 'es', {
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
export async function AuditEntryCard({ entry }: AuditEntryRowProps) {
  const { t } = await getT();
  const ta = t.admin;
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
    <li className="flex flex-col gap-2 rounded-lg border-2 border-navy bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-ink break-all">
          {entry.action}
        </span>
        <StatusCodeBadge code={entry.statusCode} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
        <span>
          {ta.audit_card_actor}{' '}
          <span className="font-medium break-all">{actor}</span>
        </span>
        <span>
          {ta.audit_card_entity}{' '}
          <span className="font-medium break-all">{entityLabel}</span>
        </span>
      </div>
      <div className="text-xs text-muted font-mono break-all">
        {entry.method} {entry.path}
      </div>
      <time
        dateTime={entry.createdAt}
        className="text-xs text-muted-soft"
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
    <tr className="border-b border-line hover:bg-surface">
      <td className="py-3 px-4 text-sm font-bold text-ink break-all">
        {entry.action}
      </td>
      <td className="py-3 px-4 text-xs text-muted break-all max-w-[12rem]">
        {actor}
      </td>
      <td className="py-3 px-4 text-xs text-muted break-all max-w-[14rem]">
        {entityLabel}
      </td>
      <td className="py-3 px-4 text-xs font-mono text-muted break-all max-w-[16rem]">
        {entry.method} {entry.path}
      </td>
      <td className="py-3 px-4">
        <StatusCodeBadge code={entry.statusCode} />
      </td>
      <td className="py-3 px-4 text-xs text-muted-soft whitespace-nowrap">
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
