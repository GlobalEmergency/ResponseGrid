import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { fetchMyVolunteerProfile, fetchMyTasks } from './actions';
import { TaskCard } from './task-card';
import { EmptyState } from '@/components/molecules/empty-state';
import { Badge } from '@/components/atoms/badge';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.account.emergency_not_found };
  return {
    title: t.account.vol_meta_title.replace('{name}', emergency.name),
    description: t.account.vol_meta_description.replace('{name}', emergency.name),
  };
}

export default async function MiVoluntariadoPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();
  const ta = t.account;

  const SKILL_LABELS: Record<string, string> = {
    driving: ta.skill_driving,
    medical: ta.skill_medical,
    logistics: ta.skill_logistics,
    cooking: ta.skill_cooking,
    languages: ta.skill_languages,
    admin: ta.skill_admin,
    general: ta.skill_general,
  };

  const AVAILABILITY_LABELS: Record<string, string> = {
    immediate: ta.availability_immediate,
    this_week: ta.availability_this_week,
    flexible: ta.availability_flexible,
  };

  const VEHICLE_LABELS: Record<string, string> = {
    none: ta.vehicle_none,
    car: ta.vehicle_car,
    van: ta.vehicle_van,
    truck: ta.vehicle_truck,
  };

  const VOLUNTEER_STATUS_LABELS: Record<string, string> = {
    available: ta.vol_status_available,
    assigned: ta.vol_status_assigned,
    inactive: ta.vol_status_inactive,
  };

  // --- Auth guard -----------------------------------------------------------
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mi-voluntariado`);
  }

  // --- Emergency resolution -------------------------------------------------
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // --- Fetch data in parallel -----------------------------------------------
  const [profile, myTasks] = await Promise.all([
    fetchMyVolunteerProfile(emergency.id, slug),
    fetchMyTasks(emergency.id, slug),
  ]);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={emergency.name}
          title={ta.vol_title}
          subtitle={ta.vol_subtitle}
        />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">

        {/* ── PERFIL ────────────────────────────────────────────────── */}
        <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
          <h2 id="profile-heading" className="text-xl font-bold text-ink">
            {ta.profile_heading}
          </h2>

          {profile === null ? (
            <div className="flex flex-col gap-4 rounded-lg border-2 border-dashed border-line px-6 py-8 text-center">
              <p className="text-base font-semibold text-ink-soft">
                {ta.not_registered_title}
              </p>
              <p className="text-sm text-muted">
                {ta.not_registered_description}
              </p>
              <Link
                href={`/e/${slug}/voluntario`}
                className="inline-flex items-center justify-center self-center rounded-lg border-2 border-navy px-5 py-3 text-sm font-semibold text-white bg-navy hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
              >
                {ta.register_cta}
              </Link>
            </div>
          ) : (
            <article
              aria-label={ta.profile_card_aria}
              className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold text-ink leading-tight">
                    {profile.name}
                  </h3>
                  <p className="text-sm text-muted">{profile.contact}</p>
                  <p className="text-sm text-muted">{profile.municipality}</p>
                </div>
                <span
                  className={[
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                    profile.status === 'available'
                      ? 'border border-success bg-success-soft text-success'
                      : profile.status === 'assigned'
                        ? 'border border-info-line bg-info-soft text-info'
                        : 'border border-line bg-surface-alt text-muted',
                  ].join(' ')}
                  aria-label={ta.status_aria.replace('{status}', VOLUNTEER_STATUS_LABELS[profile.status] ?? profile.status)}
                >
                  {VOLUNTEER_STATUS_LABELS[profile.status] ?? profile.status}
                </span>
              </div>

              {/* Skills */}
              {profile.skills.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                    {ta.skills_heading}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="role-member">
                        {SKILL_LABELS[skill] ?? skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted border-t border-line pt-3">
                <span>
                  {ta.availability_label}{' '}
                  <span className="font-semibold">
                    {AVAILABILITY_LABELS[profile.availability] ?? profile.availability}
                  </span>
                </span>
                <span>
                  {ta.vehicle_label}{' '}
                  <span className="font-semibold">
                    {VEHICLE_LABELS[profile.vehicle] ?? profile.vehicle}
                  </span>
                </span>
              </div>

              <Link
                href={`/e/${slug}/voluntario`}
                className="inline-flex items-center justify-center self-start rounded-lg border-2 border-navy px-4 py-2 text-sm font-semibold text-ink bg-white hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
              >
                {ta.edit_profile_cta}
              </Link>
            </article>
          )}
        </section>

        {/* ── MIS TAREAS ────────────────────────────────────────────── */}
        {profile !== null && (
          <section aria-labelledby="tasks-heading" className="flex flex-col gap-4">
            <h2 id="tasks-heading" className="text-xl font-bold text-ink">
              {ta.tasks_heading}
            </h2>

            {myTasks.length === 0 ? (
              <EmptyState
                title={ta.no_tasks_title}
                description={ta.no_tasks_description}
              />
            ) : (
              <ul className="flex flex-col gap-4" role="list" aria-label={ta.tasks_list_aria}>
                {myTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      volunteerId={profile.id}
                      slug={slug}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        </div>
      </div>
    </main>
  );
}
