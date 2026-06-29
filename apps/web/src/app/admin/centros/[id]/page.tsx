import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { EmptyState } from '@/components/molecules/empty-state';
import { Badge } from '@/components/atoms/badge';
import { LocalDate } from '@/components/atoms/local-date';
import { categoryLabel, categoryColor } from '@/lib/categories';
import { getT } from '@/i18n/server';
import { fetchAdminResourceDetail } from '../actions';
import {
  resourceTypeLabel,
  statusLabel,
  statusPillClasses,
  verificationLabel,
  verificationBadgeVariant,
  reportStatusLabel,
  stageLabel,
} from '../centro-presentation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.centros_detail_meta_title };
}

export default async function CentroDetailPage({ params }: Props) {
  const { id } = await params;

  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = await getToken();
  if (!token) redirect(`/login?next=/admin/centros/${id}`);

  const { data: me, response: meResponse } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (meResponse.status === 401 || !me) {
    redirect(`/login?next=/admin/centros/${id}`);
  }
  if (!me.isAdmin) redirect('/');

  const resource = await fetchAdminResourceDetail(id);

  const { t, locale } = await getT();
  const ta = t.admin;

  if (!resource) {
    return (
      <main className="flex-1 bg-surface">
        <div className="mx-auto w-full max-w-xl">
          <PageHeaderBand
            backHref="/admin/centros"
            backLabel={ta.centros_detail_back}
            title={ta.centros_title}
          />
          <div className="px-4 pb-12 pt-6">
            <EmptyState title={ta.centros_detail_not_found} />
          </div>
        </div>
      </main>
    );
  }

  const inventoryCategories = resource.inventoryCategories ?? [];
  const validityReports = resource.validityReports ?? [];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-xl">
        <PageHeaderBand
          backHref="/admin/centros"
          backLabel={ta.centros_detail_back}
          title={resource.name}
        />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">
          {/* ── Resumen ─────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-3 rounded-lg border-2 border-navy bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClasses(
                  resource.publicStatus,
                )}`}
              >
                {statusLabel(resource.publicStatus, ta)}
              </span>
              <Badge variant={verificationBadgeVariant(resource.verificationLevel)}>
                {verificationLabel(resource.verificationLevel, ta)}
              </Badge>
              {resource.isFinalRecipient && (
                <Badge variant="role-member">
                  {ta.centros_detail_recipient_label}
                </Badge>
              )}
            </div>
            <dl className="flex flex-col gap-1 text-sm text-gray-700">
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.centros_filter_type_label}:
                </dt>
                <dd>{resourceTypeLabel(resource.type, ta)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.centros_emergency_label}
                </dt>
                <dd className="break-words">
                  {resource.emergencyName ?? ta.centros_emergency_unknown}
                </dd>
              </div>
              {resource.location?.address && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_address_label}
                  </dt>
                  <dd className="break-words">{resource.location.address}</dd>
                </div>
              )}
              {resource.city && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_city_label}
                  </dt>
                  <dd>{resource.city}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-500">
                  {ta.centros_detail_stage_label}
                </dt>
                <dd>{stageLabel(resource.stage, ta)}</dd>
              </div>
              {resource.contact && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_detail_contact_label}
                  </dt>
                  <dd className="break-words">{resource.contact}</dd>
                </div>
              )}
              {resource.schedule && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_detail_schedule_label}
                  </dt>
                  <dd className="break-words">{resource.schedule}</dd>
                </div>
              )}
              {resource.manager && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_detail_manager_label}
                  </dt>
                  <dd className="break-words">{resource.manager}</dd>
                </div>
              )}
              {resource.recipientType && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_detail_recipient_type_label}
                  </dt>
                  <dd>{resource.recipientType}</dd>
                </div>
              )}
              {resource.sourceName && (
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="font-semibold text-gray-500">
                    {ta.centros_detail_source_label}
                  </dt>
                  <dd className="break-words">{resource.sourceName}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-gray-400">ID</dt>
                <dd className="break-all text-xs text-gray-400">
                  {resource.id}
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Inventario declarado ────────────────────────────────────── */}
          <section
            aria-labelledby="inventory-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="inventory-heading" className="text-lg font-bold text-ink">
              {ta.centros_detail_inventory_heading.replace(
                '{count}',
                String(inventoryCategories.length),
              )}
            </h2>
            {inventoryCategories.length === 0 ? (
              <EmptyState title={ta.centros_detail_inventory_empty} />
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  {ta.centros_detail_inventory_note}
                </p>
                <div className="flex flex-wrap gap-2" role="list">
                  {inventoryCategories.map((slug) => (
                    <span
                      key={slug}
                      role="listitem"
                      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${categoryColor(
                        slug,
                      )}`}
                    >
                      {categoryLabel(slug, locale)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* ── Reportes de validez ─────────────────────────────────────── */}
          <section
            aria-labelledby="reports-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="reports-heading" className="text-lg font-bold text-ink">
              {ta.centros_detail_reports_heading.replace(
                '{count}',
                String(validityReports.length),
              )}
            </h2>
            {validityReports.length === 0 ? (
              <EmptyState title={ta.centros_detail_reports_empty} />
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {validityReports.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-0.5 rounded-lg border border-line bg-white p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {r.reason}
                      </span>
                      <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {reportStatusLabel(r.status, ta)}
                      </span>
                    </div>
                    {r.note && (
                      <span className="break-words text-xs text-gray-500">
                        {r.note}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      <LocalDate iso={r.createdAt} withTime />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
