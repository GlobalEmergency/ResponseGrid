'use client';

import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

export default function OfflinePage() {
  const t = getMessages(useLocale()).offline;
  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand />
        <div className="flex flex-col items-center text-center gap-6 px-4 pb-12 pt-6">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line text-muted-soft text-3xl"
          >
            ⚠
          </div>
          <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
          <p className="max-w-sm text-base text-muted leading-relaxed">{t.body}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border-2 border-navy bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            {t.retry}
          </button>
        </div>
      </div>
    </main>
  );
}
