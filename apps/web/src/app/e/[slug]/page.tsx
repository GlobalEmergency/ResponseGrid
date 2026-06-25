import type { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { PublicResourceCard } from '@/app/public-resource-card';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ReliefHub' };
  }

  return {
    title: `${emergency.name} · ReliefHub`,
    description: `Información oficial y puntos activos de ayuda para ${emergency.name}. La forma más eficaz de ayudar es la donación económica a entidades verificadas.`,
  };
}

const DONT_BRING = [
  'Ropa usada sin clasificar ni empaquetar.',
  'Medicamentos — deben canalizarse a través de la vía sanitaria autorizada.',
  'Agua embotellada para envío internacional.',
  'Alimentos caseros o con fecha de caducidad próxima.',
  'Material sin destino o punto receptor asignado.',
  'No acudas por tu cuenta a la zona afectada.',
];

const CATEGORY_LABELS: Record<string, string> = {
  hygiene: 'Higiene',
  water: 'Agua',
  food: 'Alimentos',
  medical: 'Sanitario',
  shelter: 'Refugio',
  tools: 'Herramientas',
  other: 'Otro',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export default async function EmergencyPage({ params }: Props) {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);

  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;

  const [{ data: resources }, { data: needs }] = await Promise.all([
    api.GET('/emergencies/{emergencyId}/public/resources', {
      params: { path: { emergencyId } },
    }),
    api.GET('/emergencies/{emergencyId}/public/needs', {
      params: { path: { emergencyId } },
    }),
  ]);

  const activeResources = resources ?? [];
  const validatedNeeds = needs ?? [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── 1. CABECERA OFICIAL ───────────────────────────────────────── */}
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded w-fit"
          >
            ← Todas las emergencias
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {emergency.name}
            </h1>
            <span
              aria-label="Estado: emergencia activa"
              className="inline-flex items-center rounded-full border-2 border-red-700 bg-red-50 px-3 py-1 text-sm font-bold text-red-800"
            >
              Emergencia activa
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">
            Fuente oficial · ReliefHub
          </p>
        </header>

        {/* ── 2. DONACIÓN ECONÓMICA (bloque destacado) ─────────────────── */}
        <section
          aria-labelledby="donate-heading"
          className="rounded-lg border-2 border-gray-900 bg-gray-900 p-6 flex flex-col gap-4"
        >
          <h2
            id="donate-heading"
            className="text-xl font-bold text-white leading-snug"
          >
            La forma más eficaz de ayudar ahora
          </h2>
          <p className="text-base text-gray-200">
            La forma más eficaz de ayudar ahora es la{' '}
            <strong>donación económica a entidades verificadas</strong>. Permite
            que los profesionales compren exactamente lo que se necesita, donde
            y cuando se necesita.
          </p>
          <a
            href="#"
            aria-disabled="true"
            tabIndex={-1}
            className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-gray-900 bg-white rounded-lg border-2 border-white opacity-60 cursor-not-allowed focus:outline-none"
          >
            Donar a entidades verificadas
          </a>
          <p className="text-xs text-gray-400 text-center">
            Próximamente: enlace a campañas verificadas
          </p>
        </section>

        {/* ── 3. QUÉ NO LLEVAR ─────────────────────────────────────────── */}
        <section aria-labelledby="dont-bring-heading" className="flex flex-col gap-4">
          <h2
            id="dont-bring-heading"
            className="text-xl font-bold text-gray-900"
          >
            Qué NO llevar ahora
          </h2>
          <p className="text-sm text-gray-600">
            Enviar material sin coordinar satura la cadena logística y puede
            bloquear la llegada de ayuda profesional.
          </p>
          <ul className="flex flex-col gap-2" role="list">
            {DONT_BRING.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-gray-800"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center font-bold text-gray-900 text-xs"
                >
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. BOTONES DE ACCIÓN ─────────────────────────────────────── */}
        <section aria-labelledby="actions-heading" className="flex flex-col gap-4">
          <h2
            id="actions-heading"
            className="text-xl font-bold text-gray-900"
          >
            ¿Cómo quieres colaborar?
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              href={`/e/${slug}/registrar`}
              className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-white bg-gray-900 rounded-lg border-2 border-gray-900 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            >
              Ofrecer un recurso
            </Link>
            <Link
              href={`/e/${slug}/peticion`}
              className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-gray-900 bg-white rounded-lg border-2 border-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            >
              Poner una petición
            </Link>
          </div>
        </section>

        {/* ── 5. PUNTOS ACTIVOS ────────────────────────────────────────── */}
        <section aria-labelledby="points-heading" className="flex flex-col gap-4">
          <h2
            id="points-heading"
            className="text-xl font-bold text-gray-900"
          >
            Puntos activos
          </h2>

          {activeResources.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center">
              <p className="text-base font-semibold text-gray-700">
                Aún no hay puntos activos.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Por ahora, la forma más eficaz de ayudar es la donación económica.
              </p>
            </div>
          ) : (
            <ul
              className="flex flex-col gap-3"
              aria-label="Puntos activos verificados"
              role="list"
            >
              {activeResources.map((resource) => (
                <li key={resource.id}>
                  <PublicResourceCard resource={resource} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 6. NECESIDADES VALIDADAS ─────────────────────────────────── */}
        <section aria-labelledby="needs-heading" className="flex flex-col gap-4">
          <h2
            id="needs-heading"
            className="text-xl font-bold text-gray-900"
          >
            Necesidades validadas
          </h2>

          {validatedNeeds.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center">
              <p className="text-base font-semibold text-gray-700">
                Aún no hay necesidades publicadas.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" role="list" aria-label="Necesidades validadas">
              {validatedNeeds.map((need) => (
                <li
                  key={need.id}
                  className="flex flex-col gap-1 rounded-lg border-2 border-gray-900 bg-white p-4"
                >
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {need.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    {need.items[0] !== undefined && (
                      <span className="font-medium">
                        {CATEGORY_LABELS[need.items[0].category] ?? need.items[0].category}
                      </span>
                    )}
                    <span aria-hidden="true" className="text-gray-300">·</span>
                    <span>Prioridad: {PRIORITY_LABELS[need.priority] ?? need.priority}</span>
                    {need.items.length > 0 && (
                      <>
                        <span aria-hidden="true" className="text-gray-300">·</span>
                        <span>
                          {String(need.items[0]?.quantity ?? '')}
                          {need.items[0]?.unit != null ? ` ${String(need.items[0].unit)}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 7. PIE ───────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-200 pt-6 flex justify-end">
          <Link
            href={`/e/${slug}/coordinacion`}
            className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
          >
            Acceso de coordinación
          </Link>
        </footer>

      </div>
    </main>
  );
}
