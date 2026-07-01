import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { AppBar } from '@/components/organisms/app-bar';
import { EmptyState } from '@/components/molecules/empty-state';
import { categoryLabel } from '@/lib/categories';
import { formatDate } from '@/lib/format-date';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: t.donacion.meta_title.replace('{emergencyName}', emergency.name),
  };
}

/**
 * Public donor tracking (#168): a donor follows their donation by the short
 * code on their receipt/QR — no login. Shows the status, destination point and
 * what they declared; never third-party PII.
 */
export default async function DonacionTrackingPage({ params }: Props) {
  const { slug, code } = await params;
  const { t, locale } = await getT();
  const td = t.donacion;

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const { data: intake } = await api.GET(
    '/emergencies/{emergencyId}/donation-intakes/by-code/{code}',
    { params: { path: { emergencyId: emergency.id, code } } },
  );

  const shell = (children: React.ReactNode) => (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md">
        <AppBar variant="action" slug={slug} backHref={`/e/${slug}`} />
        <div className="px-4 pt-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">
            {td.page_title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{td.page_subtitle}</p>
        </div>
        <div className="flex flex-col gap-6 px-4 pb-12 pt-6">{children}</div>
      </div>
    </main>
  );

  if (intake === undefined) {
    return shell(
      <EmptyState title={td.not_found_title} description={td.not_found_body} />,
    );
  }

  const statusLabel =
    intake.status === 'received'
      ? td.status_received
      : intake.status === 'rejected'
        ? td.status_rejected
        : intake.status === 'incomplete'
          ? td.status_incomplete
          : td.status_pending;

  const pointName = intake.resourceName ?? td.point_label;

  // Two-step journey: always pre-registered, then the reception outcome.
  const secondStep =
    intake.status === 'received'
      ? {
          label: td.step_received.replace('{pointName}', pointName),
          at: intake.receivedAt ?? intake.updatedAt,
          done: true,
        }
      : intake.status === 'rejected'
        ? { label: td.step_rejected, at: intake.updatedAt, done: true }
        : intake.status === 'incomplete'
          ? { label: td.step_incomplete, at: intake.updatedAt, done: true }
          : {
              label: td.step_pending.replace('{pointName}', pointName),
              at: null,
              done: false,
            };

  const steps = [
    { label: td.step_preregistered, at: intake.createdAt, done: true },
    secondStep,
  ];

  const sectionTitle = 'font-display text-base font-bold text-navy';

  return shell(
    <>
      <div className="flex flex-col gap-1 rounded-lg border-2 border-navy bg-white px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {td.code_label}
        </span>
        <span className="font-display text-2xl font-bold tracking-widest text-navy">
          {intake.intakeCode}
        </span>
        <span className="mt-1 text-sm text-ink">
          {td.status_label}: <span className="font-semibold">{statusLabel}</span>
        </span>
        <span className="text-sm text-muted">
          {td.point_label}: {pointName}
        </span>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>{td.timeline_heading}</h2>
        <ol className="flex flex-col gap-3" role="list">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.done
                    ? 'bg-navy text-white'
                    : 'border-2 border-line bg-white text-muted'
                }`}
              >
                {step.done ? '✓' : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold text-ink">
                  {step.label}
                </span>
                {step.at != null && (
                  <span className="text-[12.5px] text-muted">
                    {formatDate(step.at, locale)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {intake.lines.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>{td.lines_heading}</h2>
          <ul className="flex flex-col gap-2" role="list">
            {intake.lines.map((line, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-white px-4 py-3"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-semibold text-ink">
                    {line.name}
                  </span>
                  <span className="text-[12.5px] text-muted">
                    {categoryLabel(line.category, locale)}
                    {line.presentation != null && line.presentation !== ''
                      ? ` · ${line.presentation}`
                      : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {line.quantity}
                  {line.unit != null && line.unit !== '' ? ` ${line.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>,
  );
}
