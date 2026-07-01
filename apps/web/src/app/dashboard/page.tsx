import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession, loginHref } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { getMe, getRoles, getPrincipalContexts } from '@/lib/navigation-data';
import { contextHref, type PrincipalContext } from '@/lib/navigation';
import type { Messages } from '@/i18n/messages/es';
import { SectionHeading } from '@/components/atoms/section-heading';
import { ContextIcon } from '@/components/atoms/context-icon';
import {
  ContextList,
  ContextListRow,
} from '@/components/molecules/context-list-row';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.panel.meta_title, description: t.panel.meta_description };
}

export default async function DashboardHomePage() {
  await requireSession('/dashboard');

  const me = await getMe();
  if (me == null) redirect(loginHref('/dashboard'));

  const { t } = await getT();
  const tp = t.panel;

  const [roles, contexts] = await Promise.all([getRoles(), getPrincipalContexts()]);
  const roleDesc = new Map(roles.map((r) => [r.id, r.description ?? r.id]));

  const emergencies = contexts.filter((c) => c.type === 'emergency');
  const resources = contexts.filter((c) => c.type === 'resource');
  const orgsGroups = contexts.filter(
    (c) => c.type === 'organization' || c.type === 'group',
  );

  // Emergencies carry roles; the rest get a generic type label as subtitle.
  const subtitleFor = (c: PrincipalContext): string | undefined => {
    if (c.type === 'emergency') {
      const labels = c.roleIds.map((id) => roleDesc.get(id) ?? id);
      return labels.length > 0 ? labels.join(' · ') : undefined;
    }
    if (c.type === 'organization') return tp.role_generic_organization;
    if (c.type === 'group') return tp.role_generic_group;
    return tp.role_generic_resource;
  };

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader
          title={tp.home_greeting.replace('{name}', me.name)}
          subtitle={tp.home_subtitle}
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-4">
          {emergencies.length > 0 && (
            <ContextSection
              heading={tp.home_section_emergencies}
              headingId="home-emergencies"
              contexts={emergencies}
              subtitleFor={subtitleFor}
              className="lg:flex-1"
            />
          )}

          {/* Resources: either the list, or the dashed "register a resource" CTA. */}
          <section aria-labelledby="home-resources" className="flex flex-col gap-3 lg:flex-1">
            <SectionHeading id="home-resources" size="sm">
              {tp.home_section_resources}
            </SectionHeading>
            {resources.length > 0 ? (
              <ContextList>
                {resources.map((c) => (
                  <ContextListRow
                    key={`${c.type}-${c.id}`}
                    href={contextHref(c)}
                    title={c.name}
                    subtitle={subtitleFor(c)}
                    icon={<ContextIcon type={c.type} resourceType={c.resourceType} />}
                  />
                ))}
              </ContextList>
            ) : (
              <RegisterResourceCta label={tp.home_register_resource} />
            )}
          </section>
        </div>

        {orgsGroups.length > 0 && (
          <ContextSection
            heading={tp.home_section_orgs_groups}
            headingId="home-orgs-groups"
            contexts={orgsGroups}
            subtitleFor={subtitleFor}
          />
        )}

        <PersonalStrip tp={tp} />
      </PageContainer>
    </main>
  );
}

/**
 * One section = one heading + one bordered `ContextList` holding every row for
 * that category (never one bordered box per context — see design review #6).
 */
function ContextSection({
  heading,
  headingId,
  contexts,
  subtitleFor,
  className = '',
}: {
  heading: string;
  headingId: string;
  contexts: PrincipalContext[];
  subtitleFor: (c: PrincipalContext) => string | undefined;
  className?: string;
}) {
  return (
    <section aria-labelledby={headingId} className={`flex flex-col gap-3 ${className}`.trim()}>
      <SectionHeading id={headingId} size="sm">
        {heading}
      </SectionHeading>
      <ContextList>
        {contexts.map((c) => (
          <ContextListRow
            key={`${c.type}-${c.id}`}
            href={contextHref(c)}
            title={c.name}
            subtitle={subtitleFor(c)}
            icon={<ContextIcon type={c.type} resourceType={c.resourceType} />}
          />
        ))}
      </ContextList>
    </section>
  );
}

/** Dashed action row shown when the principal manages no resource. */
function RegisterResourceCta({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="flex min-h-[56px] items-center gap-3 rounded-[14px] border-2 border-dashed border-accent/50 px-4 py-3 text-accent transition-colors hover:bg-accent/5 focus:outline-none focus-visible:bg-accent/5"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent"
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

/** Compact personal quick-access strip. Routes land in Plan C (may 404). */
function PersonalStrip({ tp }: { tp: Messages['panel'] }) {
  const links: { href: string; label: string }[] = [
    { href: '/dashboard/donations', label: tp.personal_donations },
    { href: '/dashboard/notifications', label: tp.personal_notifications },
    { href: '/dashboard/permissions', label: tp.personal_permissions },
    { href: '/dashboard/profile', label: tp.personal_profile },
  ];
  return (
    <section aria-labelledby="home-personal" className="flex flex-col gap-3">
      <SectionHeading id="home-personal" size="sm">
        {tp.home_personal_heading}
      </SectionHeading>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-[56px] items-center justify-center rounded-[14px] border border-line bg-white px-3 py-3 text-center text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
