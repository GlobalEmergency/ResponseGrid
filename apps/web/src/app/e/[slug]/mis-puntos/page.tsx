import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { fetchMyResources } from './actions';
import { StatusForm } from './status-form';
import { EmptyState } from '@/components/molecules/empty-state';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: 'Emergencia no encontrada · ResponseGrid' };
  return {
    title: `Mis puntos — ${emergency.name} · ResponseGrid`,
    description: `Gestiona el estado operativo de tus puntos en ${emergency.name}.`,
  };
}

const TYPE_LABELS: Record<string, string> = {
  collection_point: 'Punto de recogida',
  delivery_point: 'Punto de entrega',
  collection_and_delivery: 'Recogida y entrega',
  warehouse: 'Almacén',
  transport: 'Transporte',
  supplier: 'Proveedor',
  venue: 'Local / Espacio',
};

const STAGE_LABELS: Record<string, string> = {
  origin: 'Origen',
  intermediate: 'Intermedio',
  destination: 'Destino',
};

export default async function MisPuntosPage({ params }: Props) {
  const { slug } = await params;

  // --- Auth guard -----------------------------------------------------------
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  // --- Emergency resolution -------------------------------------------------
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  // --- Fetch my resources ---------------------------------------------------
  const myResources = await fetchMyResources(emergency.id, slug);

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-8">

        {/* ── CABECERA ──────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <Link
            href={`/e/${slug}`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            ← {emergency.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Mis puntos
          </h1>
          <p className="text-base text-gray-600">
            Actualiza el estado operativo de los puntos que has registrado.
          </p>
        </header>

        {/* ── LISTA DE PUNTOS ───────────────────────────────────────── */}
        <section aria-labelledby="my-points-heading" className="flex flex-col gap-4">
          <h2 id="my-points-heading" className="sr-only">
            Tus puntos registrados
          </h2>

          {myResources.length === 0 ? (
            <EmptyState
              title="Aún no tienes puntos registrados."
              description="Cuando registres un recurso en esta emergencia aparecerá aquí."
            />
          ) : (
            <ul className="flex flex-col gap-4" role="list" aria-label="Tus puntos registrados">
              {myResources.map((resource) => (
                <li key={resource.id}>
                  <article
                    aria-label={`Punto: ${resource.name}`}
                    className="flex flex-col gap-4 rounded-lg border-2 border-gray-900 bg-white p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        {resource.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {TYPE_LABELS[resource.type] ?? resource.type}
                        {' · '}
                        {STAGE_LABELS[resource.stage] ?? resource.stage}
                      </p>
                    </div>

                    <StatusForm
                      resourceId={resource.id}
                      currentStatus={resource.publicStatus}
                      slug={slug}
                    />

                    <Link
                      href={`/e/${slug}/reportar?resourceId=${resource.id}`}
                      className="inline-flex items-center justify-center rounded-lg border-2 border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors w-fit"
                    >
                      Reportar incidencia
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
