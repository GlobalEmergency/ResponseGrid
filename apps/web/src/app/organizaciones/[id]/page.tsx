import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { AddMemberForm } from './add-member-form';
import { RemoveMemberButton } from './remove-member-button';
import { Badge } from '@/components/atoms/badge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organización — ResponseGrid',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/organizaciones/${id}`);
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
    redirect('/organizaciones');
  }

  const memberList = members ?? [];
  const currentUserId = me?.id;
  const isOwner = memberList.some(
    (m) => m.userId === currentUserId && m.role === 'owner',
  );

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-white px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* Header */}
        <header className="flex flex-col gap-2">
          <Link
            href="/organizaciones"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Mis organizaciones
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {org?.name ?? 'Organización'}
          </h1>
          {org && (
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
              {org.type} · {org.verificationLevel}
            </p>
          )}
        </header>

        {/* Members list */}
        <section aria-labelledby="members-heading" className="flex flex-col gap-4">
          <h2 id="members-heading" className="text-xl font-bold text-gray-900">
            Miembros ({memberList.length})
          </h2>

          <ul className="flex flex-col gap-2" role="list">
            {memberList.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between rounded-lg border-2 border-gray-200 px-4 py-3 gap-3"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {member.name}
                  </span>
                  <span className="text-xs text-gray-500 truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={member.role === 'owner' ? 'role-owner' : 'role-member'}>
                    {member.role === 'owner' ? 'Propietario' : 'Miembro'}
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
          <h2 id="add-member-heading" className="text-xl font-bold text-gray-900">
            Añadir miembro
          </h2>
          {!isOwner && (
            <p className="text-sm text-gray-500">
              Solo el propietario puede añadir o eliminar miembros.
            </p>
          )}
          <AddMemberForm orgId={id} />
        </section>

      </div>
    </main>
  );
}
