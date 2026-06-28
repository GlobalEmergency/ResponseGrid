import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { fetchTemplates } from './actions';
import { CreateTemplateForm } from './create-template-form';
import { DeleteTemplateButton } from './delete-template-button';
import { CreateFromTemplateForm } from './create-from-template-form';
import { TemplateCard } from '@/components/molecules/template-card';
import { EmptyState } from '@/components/molecules/empty-state';

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
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* ── CABECERA ────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Inicio
            </Link>
            <span className="text-gray-300" aria-hidden="true">/</span>
            <Link
              href="/admin/acreditaciones"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Acreditaciones
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Plantillas de emergencia
          </h1>
          <p className="text-base text-gray-600">
            Crea plantillas reutilizables para nuevas emergencias. Solo administradores.
          </p>
        </header>

        {/* ── LISTADO ─────────────────────────────────────────────────── */}
        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-gray-900">
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

        <hr className="border-gray-200" />

        {/* ── CREAR PLANTILLA ─────────────────────────────────────────── */}
        <section aria-labelledby="create-template-heading" className="flex flex-col gap-4">
          <h2 id="create-template-heading" className="text-xl font-bold text-gray-900">
            Nueva plantilla
          </h2>
          <CreateTemplateForm />
        </section>

        <hr className="border-gray-200" />

        {/* ── CREAR EMERGENCIA DESDE PLANTILLA ────────────────────────── */}
        <section aria-labelledby="create-emergency-heading" className="flex flex-col gap-4">
          <h2 id="create-emergency-heading" className="text-xl font-bold text-gray-900">
            Crear emergencia desde plantilla
          </h2>
          <p className="text-sm text-gray-600">
            La nueva emergencia heredará la lista «qué no llevar» y el comunicado por defecto de la plantilla.
          </p>
          <CreateFromTemplateForm templates={templates} />
        </section>

      </div>
    </main>
  );
}
