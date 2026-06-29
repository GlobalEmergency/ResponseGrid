import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { getT } from '@/i18n/server';
import { categoryLabel } from '@/lib/categories';
import { formatDate } from '@/lib/format-date';
import { submitReception } from '../actions';
import { ReceptionActions } from './reception-actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; intakeId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: t.recepcion.meta_title.replace('{emergencyName}', emergency.name),
  };
}

export default async function IntakeDetailPage({ params }: Props) {
  const { slug, intakeId } = await params;
  const next = `/e/${slug}/recepcion/${intakeId}`;

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=${next}`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(`/login?next=${next}`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergency.id,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );
  if (!access.canReadIntakes) {
    redirect(`/e/${slug}`);
  }

  const res = await api.GET('/donation-intakes/{intakeId}', {
    params: { path: { intakeId } },
    headers,
  });
  if (res.response.status === 401) {
    await clearToken();
    redirect(`/login?next=${next}`);
  }
  if (res.response.status === 403) {
    redirect(`/e/${slug}/recepcion`);
  }
  const intake = res.data;
  if (intake == null) {
    notFound();
  }

  const { t, locale } = await getT();
  const tr = t.recepcion;

  const statusLabel =
    intake.status === 'received'
      ? tr.status_received
      : intake.status === 'rejected'
        ? tr.status_rejected
        : intake.status === 'incomplete'
          ? tr.status_incomplete
          : tr.status_pending;

  const isPending = intake.status === 'pending';
  const contact = [intake.donorPhone, intake.donorEmail]
    .filter((v): v is string => typeof v === 'string' && v !== '')
    .join(' · ');

  const sectionTitle = 'font-display text-base font-bold text-navy';

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}/recepcion`}
          backLabel={tr.back_to_list}
          title={tr.detail_subtitle.replace('{code}', intake.intakeCode)}
        />
        <div className="flex flex-col gap-6 px-4 pb-12 pt-6">
          <span className="w-fit rounded-full bg-surface-alt px-3 py-1 text-sm font-semibold text-ink">
            {statusLabel}
          </span>

          <section className="flex flex-col gap-1">
            <h2 className={sectionTitle}>{tr.donor_heading}</h2>
            <p className="text-[15px] text-ink">{intake.donorName}</p>
            <p className="text-sm text-muted">
              {contact !== '' ? contact : tr.no_contact}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={sectionTitle}>{tr.lines_heading}</h2>
            <ul className="flex flex-col gap-2" role="list">
              {intake.lines.map((line) => (
                <li
                  key={line.id}
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
                    {line.unit != null && line.unit !== ''
                      ? ` ${line.unit}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {isPending && access.canReceiveIntakes ? (
            <ReceptionActions
              action={submitReception.bind(null, slug, intakeId)}
              t={tr}
            />
          ) : (
            <p className="rounded-lg border-2 border-line bg-surface-alt px-4 py-3 text-sm text-muted">
              {intake.status === 'received' && intake.receivedAt != null
                ? `${tr.received_meta} · ${formatDate(intake.receivedAt, locale)}`
                : tr.already_processed}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
