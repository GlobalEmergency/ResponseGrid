import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DEMO_EMERGENCY_ID } from '@/lib/config';
import { ResourceCard } from './resource-card';

export const metadata: Metadata = {
  title: 'Panel de coordinación — ReliefHub',
  description: 'Revisa, verifica y publica los recursos pendientes.',
};

export default async function CoordinacionPage() {
  const { data: queue, error } = await api.GET(
    '/emergencies/{emergencyId}/coordination/queue',
    {
      params: { path: { emergencyId: DEMO_EMERGENCY_ID } },
    },
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Panel de coordinación
            </h1>
            <Link
              href="/"
              className="flex-shrink-0 text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
            >
              Inicio
            </Link>
          </div>
          <p className="text-base text-gray-600">
            Recursos pendientes de revisión.
          </p>
        </header>

        {/* Content */}
        {error !== undefined ? (
          <p
            role="alert"
            className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            Error al cargar la cola. Comprueba la conexión e inténtalo de nuevo.
          </p>
        ) : !queue || queue.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-gray-700">
              No hay recursos pendientes de revisión.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Cuando alguien registre un recurso aparecerá aquí.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4" aria-label="Cola de recursos">
            {queue.map((resource) => (
              <li key={resource.id}>
                <ResourceCard resource={resource} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
