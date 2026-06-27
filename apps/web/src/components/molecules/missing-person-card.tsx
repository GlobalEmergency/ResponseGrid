import Link from 'next/link';
import { ReunificationStatusBadge } from '@/components/atoms/reunification-status-badge';
import type { components } from '@reliefhub/api-client';
import type { Messages } from '@/i18n/messages/es';

type MissingPersonReportListItemDto =
  components['schemas']['MissingPersonReportListItemDto'];

interface MissingPersonCardProps {
  report: MissingPersonReportListItemDto;
  slug: string;
  t: Messages['coord_reunificacion'];
}

/**
 * Masks a document ID, showing only the last 4 characters.
 * E.g. "12345678A" → "V-**5678A" (last 4 shown, rest replaced with **)
 */
function maskDocumentId(raw: string): string {
  if (raw.length <= 4) return raw;
  const visible = raw.slice(-4);
  return `**${visible}`;
}

export function MissingPersonCard({ report, slug, t }: MissingPersonCardProps) {
  // documentId arrives from API as PersonDetailResponseDto which has
  // documentId?: Record<string, never> in list items (not exposed) vs full detail.
  // In list items (MissingPersonReportListItemDto) person is PersonResponseDto — no documentId.
  // We show only what's available: name, age, status, date.

  return (
    <article className="flex flex-col gap-3 rounded-lg border-2 border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-gray-900">
            {report.person.firstName} {report.person.lastName}
          </span>
          {report.person.approximateAge != null &&
            Object.keys(report.person.approximateAge).length > 0 && (
              <span className="text-sm text-gray-500">
                {String(report.person.approximateAge as unknown as number)} años aprox.
              </span>
            )}
          <span className="text-sm text-gray-600 mt-1">
            {report.person.lastKnownLocation}
          </span>
        </div>
        <ReunificationStatusBadge status={report.status} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
        <time
          suppressHydrationWarning
          dateTime={report.createdAt}
          className="text-xs text-gray-400"
        >
          {new Date(report.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
        <Link
          href={`/e/${slug}/coordinacion/reunificacion/${report.id}`}
          className="inline-flex items-center justify-center rounded-lg border-2 border-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
        >
          {t.view_detail}
        </Link>
      </div>
    </article>
  );
}

// Re-export the masking helper for use in detail pages
export { maskDocumentId };
