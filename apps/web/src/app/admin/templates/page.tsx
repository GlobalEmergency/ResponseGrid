import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchTemplates } from './actions';
import { CreateTemplateForm } from './create-template-form';
import { DeleteTemplateButton } from './delete-template-button';
import { CreateFromTemplateForm } from './create-from-template-form';
import { TemplateCard } from '@/components/molecules/template-card';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeaderBand } from '@/components/molecules/page-header-band';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Plantillas de emergencia — Admin · ResponseGrid',
  description: 'Gestión de plantillas de emergencia.',
};

export default async function TemplatesPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/admin/templates');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/admin/templates');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  // ── Fetch templates ──────────────────────────────────────────────────────
  const templates = await fetchTemplates();

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/"
          backLabel="← Inicio"
          title="Plantillas de emergencia"
          subtitle="Crea plantillas reutilizables para nuevas emergencias. Solo administradores."
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">

        {/* ── LISTADO ─────────────────────────────────────────────────── */}
        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-ink">
            Plantillas disponibles ({templates.length})
          </h2>

          {templates.length === 0 ? (
            <EmptyState
              title="No hay plantillas todavía."
              description="Usa el formulario de abajo para crear la primera plantilla."
            />
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {templates.map((t) => (
                <li key={t.id}>
                  <TemplateCard
                    name={t.name}
                    description={t.description}
                    dontBringCount={t.dontBringList.length}
                    createdAt={t.createdAt}
                    actions={<DeleteTemplateButton templateId={t.id} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-line" />

        {/* ── CREAR PLANTILLA ─────────────────────────────────────────── */}
        <section aria-labelledby="create-template-heading" className="flex flex-col gap-4">
          <h2 id="create-template-heading" className="text-xl font-bold text-ink">
            Nueva plantilla
          </h2>
          <CreateTemplateForm />
        </section>

        <hr className="border-line" />

        {/* ── CREAR EMERGENCIA DESDE PLANTILLA ────────────────────────── */}
        <section aria-labelledby="create-emergency-heading" className="flex flex-col gap-4">
          <h2 id="create-emergency-heading" className="text-xl font-bold text-ink">
            Crear emergencia desde plantilla
          </h2>
          <p className="text-sm text-muted">
            La nueva emergencia heredará la lista «qué no llevar» y el comunicado por defecto de la plantilla.
          </p>
          <CreateFromTemplateForm templates={templates} />
        </section>

        </div>
      </div>
    </main>
  );
}
