import { MissingPersonCard } from '@/components/molecules/missing-person-card';
import { EmptyState } from '@/components/molecules/empty-state';
import type { components } from '@reliefhub/api-client';
import type { Messages } from '@/i18n/messages/es';

type MissingPersonReportListItemDto =
  components['schemas']['MissingPersonReportListItemDto'];

interface MissingPersonQueueProps {
  reports: MissingPersonReportListItemDto[];
  slug: string;
  t: Messages['coord_reunificacion'];
}

/**
 * MissingPersonQueue — List of missing person reports for coordinators.
 * Each card shows masked doc ID (via MissingPersonCard), status, age, date.
 */
export function MissingPersonQueue({
  reports,
  slug,
  t,
}: MissingPersonQueueProps) {
  if (reports.length === 0) {
    return <EmptyState title={t.empty_queue} />;
  }

  return (
    <ul className="flex flex-col gap-4" role="list" aria-label={t.queue_heading}>
      {reports.map((report) => (
        <li key={report.id}>
          <MissingPersonCard report={report} slug={slug} t={t} />
        </li>
      ))}
    </ul>
  );
}
