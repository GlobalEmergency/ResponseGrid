import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireSession, loginHref, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import { WorkQueue } from '@/components/organisms/work-queue';
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

export default async function ManageResourcesDisputesPage({ params }: Props) {
  const { slug } = await params;

  const token = await requireSession(`/emergencies/${slug}/manage/resources/disputes`);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(loginHref(`/emergencies/${slug}/manage/resources/disputes`));
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Same permission as the verification queue (resource coordination).
  if (!access.canVerifyResources) {
    redirect(`/emergencies/${slug}/manage`);
  }

  const result = await api.GET(
    '/emergencies/{emergencyId}/coordination/disputed',
    { params: { path: { emergencyId } }, headers },
  );

  if (result.response.status === 401) {
    await clearToken();
    redirect(loginHref(`/emergencies/${slug}/manage/resources/disputes`));
  }
  if (result.response.status === 403) {
    redirect(`/emergencies/${slug}/manage`);
  }

  const items = result.data ?? [];

  const { t } = await getT();
  const tc = t.coord;

  return (
    <WorkQueue title={tc.disputes_heading} headingId="disputes-heading">
      <DisputedQueue items={items} slug={slug} />
    </WorkQueue>
  );
}
