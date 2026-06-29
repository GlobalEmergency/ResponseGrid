import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { AddMemberForm } from './add-member-form';
import { RemoveMemberButton } from './remove-member-button';
import { Badge } from '@/components/atoms/badge';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.org_detail.meta_title };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/panel/organizaciones/${id}`);
  }

  // Fetch current user id to determine ownership
  const { data: me } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });

  // Fetch my orgs to show org name
  const { data: myOrgs } = await api.GET('/organizations/mine', {
    headers: authHeaders(token),
  });

  const org = myOrgs?.find((o) => o.id === id);

  // Fetch members
  const { data: members, error: membersError } = await api.GET(
    '/organizations/{id}/members',
    {
      params: { path: { id } },
      headers: authHeaders(token),
    },
  );

  if (membersError !== undefined) {
    // Not a member of this org → redirect
    redirect('/panel/organizaciones');
  }

  const memberList = members ?? [];
  const currentUserId = me?.id;
  const isOwner = memberList.some(
    (m) => m.userId === currentUserId && m.role === 'owner',
  );
  const { t } = await getT();
  const td = t.org_detail;

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader
          backHref="/panel/organizaciones"
          backLabel={td.back}
          title={org?.name ?? td.fallback_title}
          subtitle={org ? `${org.type} · ${org.verificationLevel}` : undefined}
        />

        {/* Members list */}
        <section aria-labelledby="members-heading" className="flex flex-col gap-4">
          <h2 id="members-heading" className="text-xl font-bold text-ink">
            {td.members_heading} ({memberList.length})
          </h2>

          <ul className="flex flex-col gap-2" role="list">
            {memberList.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between rounded-lg border border-line px-4 py-3 gap-3"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-ink truncate">
                    {member.name}
                  </span>
                  <span className="text-xs text-muted truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={member.role === 'owner' ? 'role-owner' : 'role-member'}>
                    {member.role === 'owner' ? td.role_owner : td.role_member}
                  </Badge>
                  {isOwner && member.userId !== currentUserId && (
                    <RemoveMemberButton orgId={id} userId={member.userId} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Add member form */}
        <section aria-labelledby="add-member-heading" className="flex flex-col gap-4">
          <h2 id="add-member-heading" className="text-xl font-bold text-ink">
            {td.add_heading}
          </h2>
          {!isOwner && (
            <p className="text-sm text-muted">
              {td.only_owner}
            </p>
          )}
          <AddMemberForm orgId={id} />
        </section>
      </PageContainer>
    </main>
  );
}
