import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { fetchTemplates } from './actions';
import { CreateTemplateForm } from './create-template-form';
import { DeleteTemplateButton } from './delete-template-button';
import { CreateFromTemplateForm } from './create-from-template-form';
import { TemplateCard } from '@/components/molecules/template-card';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.templates.meta_title,
    description: t.templates.meta_description,
  };
}

export default async function TemplatesPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/plantillas');
  }

  // ── Admin check via GET /auth/me ────────────────────────────────────────
  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  if (meResponse.status === 401 || !me) {
    redirect('/login?next=/panel/administracion/plantillas');
  }

  if (!me.isAdmin) {
    redirect('/');
  }

  // ── Fetch templates ──────────────────────────────────────────────────────
  const templates = await fetchTemplates();

  const { t } = await getT();

  return (
    <>
      <PageHeader title={t.templates.title} subtitle={t.templates.subtitle} />

      {/* ── LISTADO ─────────────────────────────────────────────────── */}
        <section aria-labelledby="list-heading" className="flex flex-col gap-4">
          <h2 id="list-heading" className="text-xl font-bold text-ink">
            {t.templates.list_heading.replace('{count}', String(templates.length))}
          </h2>

          {templates.length === 0 ? (
            <EmptyState
              title={t.templates.empty_title}
              description={t.templates.empty_description}
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
            {t.templates.new_heading}
          </h2>
          <CreateTemplateForm />
        </section>

        <hr className="border-line" />

        {/* ── CREAR EMERGENCIA DESDE PLANTILLA ────────────────────────── */}
        <section aria-labelledby="create-emergency-heading" className="flex flex-col gap-4">
          <h2 id="create-emergency-heading" className="text-xl font-bold text-ink">
            {t.templates.create_from_heading}
          </h2>
          <p className="text-sm text-muted">
            {t.templates.inheritance_note}
          </p>
          <CreateFromTemplateForm templates={templates} />
        </section>
    </>
  );
}
