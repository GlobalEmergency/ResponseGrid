import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { VolunteerCard } from '@/components/molecules/volunteer-card';
import { VolunteerRosterFilter } from '@/components/molecules/volunteer-roster-filter';
import { TaskCard } from '@/components/organisms/task-card';
import { CreateTaskForm } from '@/components/organisms/create-task-form';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';
import type { components } from '@reliefhub/api-client';

// Always fetch live data — never serve a stale cached page.
export const dynamic = 'force-dynamic';

type VolunteerStatus = components['schemas']['VolunteerViewDto']['status'];
type VolunteerSkill = components['schemas']['VolunteerViewDto']['skills'][number];
type VolunteerAvailability = components['schemas']['VolunteerViewDto']['availability'];
type VolunteerVehicle = components['schemas']['VolunteerViewDto']['vehicle'];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return {
    title: t.coord.volunteers_meta_title.replace('{name}', emergency.name),
    description: t.coord.volunteers_meta_description.replace('{name}', emergency.name),
  };
}

export default async function CoordinacionVoluntariosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  // --- Auth guard ---
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/voluntarios`);
  }

  // --- Emergency resolution ---
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  // --- Parse roster filter params ---
  const VALID_SKILLS: VolunteerSkill[] = ['driving', 'medical', 'logistics', 'cooking', 'languages', 'admin', 'general'];
  const VALID_AVAILABILITIES: VolunteerAvailability[] = ['immediate', 'this_week', 'flexible'];
  const VALID_VEHICLES: VolunteerVehicle[] = ['none', 'car', 'van', 'truck'];
  const VALID_STATUSES: VolunteerStatus[] = ['available', 'assigned', 'inactive'];

  const rawSkill = typeof resolvedSearchParams.skill === 'string' ? resolvedSearchParams.skill : undefined;
  const rawAvailability = typeof resolvedSearchParams.availability === 'string' ? resolvedSearchParams.availability : undefined;
  const rawVehicle = typeof resolvedSearchParams.vehicle === 'string' ? resolvedSearchParams.vehicle : undefined;
  const rawStatus = typeof resolvedSearchParams.vstatus === 'string' ? resolvedSearchParams.vstatus : undefined;

  const skillFilter = VALID_SKILLS.includes(rawSkill as VolunteerSkill) ? rawSkill as VolunteerSkill : undefined;
  const availabilityFilter = VALID_AVAILABILITIES.includes(rawAvailability as VolunteerAvailability) ? rawAvailability as VolunteerAvailability : undefined;
  const vehicleFilter = VALID_VEHICLES.includes(rawVehicle as VolunteerVehicle) ? rawVehicle as VolunteerVehicle : undefined;
  const statusFilter = VALID_STATUSES.includes(rawStatus as VolunteerStatus) ? rawStatus as VolunteerStatus : undefined;

  // --- Fetch roster and tasks in parallel ---
  const [rosterResult, tasksResult] = await Promise.all([
    api.GET('/emergencies/{emergencyId}/volunteers', {
      params: {
        path: { emergencyId },
        query: {
          ...(skillFilter !== undefined && { skill: skillFilter }),
          ...(availabilityFilter !== undefined && { availability: availabilityFilter }),
          ...(vehicleFilter !== undefined && { vehicle: vehicleFilter }),
          ...(statusFilter !== undefined && { status: statusFilter }),
        },
      },
      headers,
    }),
    api.GET('/emergencies/{emergencyId}/tasks', {
      params: { path: { emergencyId } },
      headers,
    }),
  ]);

  // Handle 401 — token expired
  if (rosterResult.response.status === 401 || tasksResult.response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/voluntarios`);
  }

  // Handle 403 — not a coordinator for this emergency
  if (rosterResult.response.status === 403 || tasksResult.response.status === 403) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const volunteers = rosterResult.data ?? [];
  const tasks = tasksResult.data ?? [];

  // Volunteers available for assignment (unfiltered — we always want all available ones in the select)
  // Re-use the roster data; in filtered view the user might still want to assign from the full list
  // so we fetch them separately only if the filter excludes 'available'.
  const availableVolunteers = statusFilter !== undefined && statusFilter !== 'available'
    ? [] // filtered view excludes available — provide empty list; coordinator can remove filter to assign
    : volunteers.filter((v) => v.status === 'available');

  const { t } = await getT();
  const tc = t.coord;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 pb-12 pt-6 lg:max-w-5xl lg:px-8">

        <header className="flex flex-col gap-2">
          <h1 className="font-display text-xl font-bold text-navy lg:text-2xl">{tc.volunteers_title}</h1>
          <p className="text-sm text-muted">{emergency.name}</p>
        </header>

        {/* ── ROSTER DE VOLUNTARIOS ────────────────────────────────── */}
        <section aria-labelledby="roster-heading" className="flex flex-col gap-4">
          <h2
            id="roster-heading"
            className="text-xl font-bold text-ink"
          >
            {tc.roster_heading}
          </h2>

          <VolunteerRosterFilter />

          {volunteers.length === 0 ? (
            <EmptyState
              title={tc.roster_empty_title}
              description={tc.roster_empty_description}
            />
          ) : (
            <ul className="flex flex-col gap-3" aria-label={tc.roster_list_label}>
              {volunteers.map((volunteer) => (
                <li key={volunteer.id}>
                  <VolunteerCard volunteer={volunteer} slug={slug} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-line" />

        {/* ── TAREAS ───────────────────────────────────────────────── */}
        <section aria-labelledby="tasks-heading" className="flex flex-col gap-6">
          <h2
            id="tasks-heading"
            className="text-xl font-bold text-ink"
          >
            {tc.tasks_heading}
          </h2>

          {/* Create task form */}
          <CreateTaskForm emergencyId={emergencyId} slug={slug} />

          {/* Task list */}
          {tasks.length === 0 ? (
            <EmptyState
              title={tc.tasks_empty_title}
              description={tc.tasks_empty_description}
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label={tc.tasks_list_label}>
              {tasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    availableVolunteers={availableVolunteers}
                    slug={slug}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
