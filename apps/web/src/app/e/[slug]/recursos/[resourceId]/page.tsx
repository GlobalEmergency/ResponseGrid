import { notFound } from "next/navigation";
import Link from "next/link";
import { clearToken, getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { getEmergencyBySlug } from "@/lib/emergencies";
import { getMe, getRoles } from "@/lib/navigation-data";
import type { MeGrant, RoleCatalogEntry } from "@/lib/admin-scopes";
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from "@/lib/emergency-permissions";
import { PublicResourceCard } from "@/components/organisms/public-resource-card";
import { NeedCard } from "@/components/molecules/need-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { categoryLabel, categoryColor } from "@/lib/categories";
import { getT } from "@/i18n/server";
import { ResourceGrantsPanel } from "./resource-grants-panel";
import { fetchResourceGrants } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string; resourceId: string }>;
};

export default async function RecipientResourcePage({ params }: Props) {
  const { slug, resourceId } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t, locale } = await getT();

  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const isActive = emergency.status === "active";
  const token = await getToken();
  let access: EmergencyAccess | null = null;

  if (token !== null) {
    const [me, roles] = await Promise.all([getMe(), getRoles()]);
    if (me === null) {
      await clearToken();
    } else {
      access = resolveEmergencyAccess(
        emergencyId,
        (me.grants ?? []) as MeGrant[],
        roles as RoleCatalogEntry[],
      );
    }
  }

  const [{ data: resource }, { data: needs }] = await Promise.all([
    api.GET("/emergencies/{emergencyId}/public/resources/{resourceId}", {
      params: { path: { emergencyId, resourceId } },
    }),
    api.GET("/emergencies/{emergencyId}/public/needs", {
      params: { path: { emergencyId }, query: { resourceId } },
    }),
  ]);

  if (!resource) {
    notFound();
  }

  const te = t.emergency;
  const td = t.resource_detail;
  const recipientNeeds = needs ?? [];
  const inventoryCategories = resource.inventoryCategories ?? [];
  const canManagePoint = access?.canCoordinate ?? false;
  const resourceGrants = canManagePoint
    ? await fetchResourceGrants(resourceId)
    : [];

  // Citizen delivery pre-registration (#130) is offered only for active
  // collection points of an active emergency — the same targets the API accepts.
  const canPreRegister =
    isActive &&
    resource.publicStatus === "active" &&
    (resource.type === "collection_point" ||
      resource.type === "collection_and_delivery");

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl bg-surface">
        <div className="flex flex-col gap-5 px-4 pb-12 pt-5 lg:gap-6 lg:px-8">
          <Link
            href={`/e/${slug}`}
            className="w-fit text-sm font-semibold text-navy hover:underline"
          >
            ← {td.back}
          </Link>

          <PublicResourceCard
            resource={resource}
            t={t.resource_card}
            tVerification={t.verification_badge}
            tStatusLight={t.status_light}
            locale={locale}
          />

          {canPreRegister && (
            <Link
              href={`/e/${slug}/pre-registro?resourceId=${resourceId}`}
              className="flex flex-col gap-0.5 rounded-lg bg-navy px-5 py-4 transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              <span className="text-base font-semibold text-white">
                {td.prereg_cta}
              </span>
              <span className="text-sm text-white/80">
                {td.prereg_cta_hint}
              </span>
            </Link>
          )}

          <Link
            href={`/e/${slug}/recursos/${resourceId}/reportar-estado`}
            className="w-fit text-sm font-semibold text-warning hover:underline"
          >
            {t.resource_card.report_cta}
          </Link>

          {canManagePoint && (
            <ResourceGrantsPanel
              slug={slug}
              resourceId={resourceId}
              grants={resourceGrants}
              locale={locale}
            />
          )}

          <section
            aria-labelledby="resource-inventory-heading"
            className="flex flex-col gap-3"
          >
            <h2
              id="resource-inventory-heading"
              className="font-display text-base font-bold text-navy"
            >
              {td.inventory_heading}
            </h2>
            {inventoryCategories.length === 0 ? (
              <EmptyState title={td.inventory_empty} />
            ) : (
              <div className="flex flex-wrap gap-2" role="list">
                {inventoryCategories.map((slug) => (
                  <span
                    key={slug}
                    role="listitem"
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${categoryColor(slug)}`}
                  >
                    {categoryLabel(slug, locale)}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="recipient-needs-heading"
            className="flex flex-col gap-3"
          >
            <h2
              id="recipient-needs-heading"
              className="font-display text-base font-bold text-navy"
            >
              {td.needs_heading}
            </h2>
            {recipientNeeds.length === 0 ? (
              <EmptyState title={td.needs_empty} />
            ) : (
              <ul className="flex flex-col gap-2.5" role="list">
                {recipientNeeds.map((need) => (
                  <li key={need.id}>
                    <NeedCard
                      need={need}
                      te={te}
                      slug={slug}
                      active={isActive}
                      locale={locale}
                    />
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
