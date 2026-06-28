'use client';

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 text-3xl"
      >
        ⚠
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Sin conexión</h1>
      <p className="max-w-sm text-base text-gray-600 leading-relaxed">
        No hay conexión a internet. Revisa tu red e inténtalo de nuevo.
        Los borradores que hayas iniciado se conservan para cuando vuelvas a
        estar en línea.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg border-2 border-gray-900 bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      >
        Reintentar
      </button>
    </main>
  );
}
