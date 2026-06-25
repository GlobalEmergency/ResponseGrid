import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';

// Emergency list must reflect live backend state on every request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ReliefHub — Emergencias activas',
  description:
    'Plataforma de coordinación de ayuda en emergencias. Consulta las emergencias activas y cómo puedes colaborar.',
};

export default async function HomePage() {
  const { data: emergencies } = await api.GET('/emergencies');

  const activeEmergencies = emergencies ?? [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── CABECERA ─────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            ReliefHub
          </h1>
          <p className="text-base text-gray-600">
            Coordinación de recursos en emergencias.
          </p>
        </header>

        {/* ── EMERGENCIAS ACTIVAS ───────────────────────────────────────── */}
        <section aria-labelledby="emergencies-heading" className="flex flex-col gap-4">
          <h2
            id="emergencies-heading"
            className="text-xl font-bold text-gray-900"
          >
            Emergencias activas
          </h2>

          {activeEmergencies.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center">
              <p className="text-base font-semibold text-gray-700">
                No hay emergencias activas en este momento.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Cuando se active una emergencia aparecerá aquí.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3" role="list" aria-label="Lista de emergencias activas">
              {activeEmergencies.map((emergency) => (
                <li key={emergency.id}>
                  <Link
                    href={`/e/${emergency.slug}`}
                    className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-bold text-gray-900 leading-tight">
                        {emergency.name}
                      </span>
                      <span
                        aria-label="Estado: activa"
                        className="inline-flex items-center rounded-full border-2 border-red-700 bg-red-50 px-3 py-0.5 text-xs font-bold text-red-800"
                      >
                        Activa
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                      {emergency.country}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
