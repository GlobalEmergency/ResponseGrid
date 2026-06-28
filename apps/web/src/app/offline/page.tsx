'use client';

import { PageHeaderBand } from '@/components/molecules/page-header-band';

export default function OfflinePage() {
  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-sm">
        <PageHeaderBand />
        <div className="flex flex-col items-center text-center gap-6 px-4 pb-12 pt-6">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line text-muted-soft text-3xl"
          >
            ⚠
          </div>
          <h1 className="text-2xl font-bold text-ink">Sin conexión</h1>
          <p className="max-w-sm text-base text-muted leading-relaxed">
            No hay conexión a internet. Revisa tu red e inténtalo de nuevo.
            Los borradores que hayas iniciado se conservan para cuando vuelvas a
            estar en línea.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border-2 border-navy bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            Reintentar
          </button>
        </div>
      </div>
    </main>
  );
}
