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

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: `Mi voluntariado — ${emergency.name} · ResponseGrid`,
    description: `Gestiona tu participación como voluntario en ${emergency.name}.`,
  };
}

const SKILL_LABELS: Record<string, string> = {
  driving: 'Conducción',
  medical: 'Sanitario',
  logistics: 'Logística',
  cooking: 'Cocina',
  languages: 'Idiomas',
  admin: 'Administración',
  general: 'General',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Inmediata',
  this_week: 'Esta semana',
  flexible: 'Flexible',
};

const VEHICLE_LABELS: Record<string, string> = {
  none: 'Ninguno',
  car: 'Coche',
  van: 'Furgoneta',
  truck: 'Camión',
};

const VOLUNTEER_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  assigned: 'Asignado',
  inactive: 'Inactivo',
};

export default async function MiVoluntariadoPage({ params }: Props) {
  const { slug } = await params;

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
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={emergency.name}
          title="Mi voluntariado"
          subtitle="Tu perfil y las tareas en las que participas."
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        {/* ── PERFIL ────────────────────────────────────────────────── */}
        <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
          <h2 id="profile-heading" className="text-xl font-bold text-ink">
            Tu perfil
          </h2>

          {profile === null ? (
            <div className="flex flex-col gap-4 rounded-lg border-2 border-dashed border-line px-6 py-8 text-center">
              <p className="text-base font-semibold text-ink-soft">
                Aún no estás apuntado como voluntario.
              </p>
              <p className="text-sm text-muted">
                Regístrate para que el equipo de coordinación pueda contactarte y asignarte tareas.
              </p>
              <Link
                href={`/e/${slug}/voluntario`}
                className="inline-flex items-center justify-center self-center rounded-lg border-2 border-navy px-5 py-3 text-sm font-semibold text-white bg-navy hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
              >
                Apuntarme como voluntario
              </Link>
            </div>
          ) : (
            <article
              aria-label="Tu perfil de voluntario"
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
                      ? 'border border-green-400 bg-green-50 text-green-800'
                      : profile.status === 'assigned'
                        ? 'border border-blue-400 bg-blue-50 text-blue-800'
                        : 'border border-line bg-surface-alt text-muted',
                  ].join(' ')}
                  aria-label={`Estado: ${VOLUNTEER_STATUS_LABELS[profile.status] ?? profile.status}`}
                >
                  {VOLUNTEER_STATUS_LABELS[profile.status] ?? profile.status}
                </span>
              </div>

              {/* Skills */}
              {profile.skills.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                    Habilidades
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
                  Disponibilidad:{' '}
                  <span className="font-semibold">
                    {AVAILABILITY_LABELS[profile.availability] ?? profile.availability}
                  </span>
                </span>
                <span>
                  Vehículo:{' '}
                  <span className="font-semibold">
                    {VEHICLE_LABELS[profile.vehicle] ?? profile.vehicle}
                  </span>
                </span>
              </div>

              <Link
                href={`/e/${slug}/voluntario`}
                className="inline-flex items-center justify-center self-start rounded-lg border-2 border-navy px-4 py-2 text-sm font-semibold text-ink bg-white hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
              >
                Editar mis datos
              </Link>
            </article>
          )}
        </section>

        {/* ── MIS TAREAS ────────────────────────────────────────────── */}
        {profile !== null && (
          <section aria-labelledby="tasks-heading" className="flex flex-col gap-4">
            <h2 id="tasks-heading" className="text-xl font-bold text-ink">
              Mis tareas
            </h2>

            {myTasks.length === 0 ? (
              <EmptyState
                title="No tienes tareas asignadas aún."
                description="El equipo de coordinación te asignará tareas cuando las haya disponibles."
              />
            ) : (
              <ul className="flex flex-col gap-4" role="list" aria-label="Tus tareas asignadas">
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
