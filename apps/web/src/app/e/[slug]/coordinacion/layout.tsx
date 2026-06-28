import type { ReactNode } from 'react';
import { getT } from '@/i18n/server';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { DashboardLayout } from '@/lib/dashboard-layout';
import { EmergencyContextBanner } from '@/components/molecules/emergency-context-banner';

/**
 * Wraps the coordination subtree in the dashboard shell and pins an emergency
 * context banner above it (which emergency you're operating + a way back out).
 */
export default async function CoordinacionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);

  const banner = emergency ? (
    <EmergencyContextBanner
      name={emergency.name}
      slug={slug}
      contextLabel={t.nav.emergency_context}
      exitLabel={t.nav.exit_emergency}
    />
  ) : undefined;

  return <DashboardLayout emergencyContext={banner}>{children}</DashboardLayout>;
}
