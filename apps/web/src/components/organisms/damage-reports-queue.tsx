import { ReportCard } from '@/components/organisms/report-card';
import type { FieldReport } from '@/components/organisms/report-card';
import type { DamageLevel } from '@/components/atoms/damage-level-badge';

interface DamageReportsQueueProps {
  reports: FieldReport[];
  slug: string;
}

/** Criticality sort: trapped_persons first, then by damage level, then by creation date */
function criticalityScore(r: FieldReport): number {
  if (r.type === 'trapped_persons') return 0;
  const levelScore: Record<DamageLevel, number> = {
    collapsed: 1,
    severe: 2,
    moderate: 3,
  };
  if (r.damageLevel != null) return levelScore[r.damageLevel] ?? 4;
  return 5;
}

export function DamageReportsQueue({ reports, slug }: DamageReportsQueueProps) {
  const sarReports = reports
    .filter((r) => r.type === 'structural_damage' || r.type === 'trapped_persons')
    .slice()
    .sort((a, b) => {
      const scoreDiff = criticalityScore(a) - criticalityScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      // secondary: creation date descending (newest first)
      const aTime = a.createdAt != null ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt != null ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  if (sarReports.length === 0) return null;

  const pendingTrapped = sarReports.filter(
    (r) => r.type === 'trapped_persons' && r.status !== 'reviewed' && r.status !== 'published',
  );

  return (
    <section aria-labelledby="sar-queue-heading" className="flex flex-col gap-4">
      {/* Urgent alert */}
      {pendingTrapped.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border-2 border-red-700 bg-red-50 p-4"
        >
          <span aria-hidden="true" className="text-2xl flex-shrink-0">🚨</span>
          <div>
            <p className="text-sm font-bold text-red-800">
              {pendingTrapped.length === 1
                ? '1 parte de personas atrapadas pendiente de revisión'
                : `${pendingTrapped.length} partes de personas atrapadas pendientes de revisión`}
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Revisa y publica cuanto antes para que los equipos SAR puedan actuar.
            </p>
          </div>
        </div>
      )}

      <h2 id="sar-queue-heading" className="text-xl font-bold text-gray-900">
        Daños estructurales y personas atrapadas
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({sarReports.length})
        </span>
      </h2>

      <ul className="flex flex-col gap-4" aria-label="Cola SAR — daños y atrapados">
        {sarReports.map((report) => (
          <li key={report.id}>
            <ReportCard report={report} slug={slug} />
          </li>
        ))}
      </ul>
    </section>
  );
}
