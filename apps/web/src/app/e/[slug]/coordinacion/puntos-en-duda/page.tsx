import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { DisputedQueue } from '@/components/organisms/disputed-queue';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return {
    title: t.coord.disputes_section_meta_title.replace('{name}', emergency.name),
    description: t.coord.disputes_section_meta_description.replace(
      '{name}',
      emergency.name,
    ),
  };
}

export default async function CoordinacionDisputesPage({ params }: Props) {
  const { slug } = await params;

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/puntos-en-duda`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/puntos-en-duda`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Same permission as the verification queue (resource coordination).
  if (!access.canVerifyResources) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const result = await api.GET(
    '/emergencies/{emergencyId}/coordination/disputed',
    { params: { path: { emergencyId } }, headers },
  );

  if (result.response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/puntos-en-duda`);
  }
  if (result.response.status === 403) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const items = result.data ?? [];

  const { t } = await getT();
  const tc = t.coord;

  return (
    <section aria-labelledby="disputes-heading" className="flex flex-col gap-5">
      <h2 id="disputes-heading" className="text-xl font-bold text-ink">
        {tc.disputes_heading}
      </h2>
      <DisputedQueue items={items} slug={slug} />
    </section>
  );
}
