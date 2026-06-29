import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import {
  fetchGroup,
  fetchGroupMembers,
  fetchMyGroups,
} from '../actions';
import { AddMemberForm } from './add-member-form';
import { MemberRowActions } from './member-row-actions';
import { JoinButton } from './join-button';
import { scopeTypeLabel, shortId } from '@/lib/permissions';
import { EmptyState } from '@/components/molecules/empty-state';
import { PageContainer } from '@/components/molecules/page-container';
import { PageHeader } from '@/components/molecules/page-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Grupo · ResponseGrid',
};

type Props = { params: Promise<{ id: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params;

  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/panel/grupos/${id}`);
  }

  const group = await fetchGroup(id);
  if (!group) {
    notFound();
  }

  const [members, myGroups] = await Promise.all([
    fetchGroupMembers(id),
    fetchMyGroups(),
  ]);

  const isManager = members !== null; // null => 403 reading members
  const myMembership = myGroups.find((g) => g.id === id);

  return (
    <main className="flex-1 bg-surface">
      <PageContainer>
        <PageHeader
          title={group.name}
          backHref="/panel/grupos"
          backLabel="Mis grupos"
          badges={
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  group.visibility === 'public'
                    ? 'border-green-400 bg-green-50 text-green-800'
                    : 'border-line bg-surface text-muted'
                }`}
              >
                {group.visibility === 'public' ? 'Público' : 'Privado'}
              </span>
              <span>
                {scopeTypeLabel(group.ownerKind)} · {shortId(group.ownerId)}
              </span>
            </div>
          }
        />

        {/* ── Manager view ─────────────────────────────────────────────── */}
        {isManager ? (
          <>
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-ink">
                Miembros ({members.length})
              </h2>
              {members.length === 0 ? (
                <EmptyState title="Este grupo aún no tiene miembros." />
              ) : (
                <ul className="flex flex-col gap-2" role="list">
                  {members.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-mono text-xs text-ink-soft break-all">
                          {m.userId}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            m.status === 'approved'
                              ? 'text-green-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {m.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </div>
                      <MemberRowActions
                        groupId={id}
                        userId={m.userId}
                        status={m.status}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <hr className="border-line" />

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-ink">Añadir miembro</h2>
              <AddMemberForm groupId={id} />
            </section>
          </>
        ) : (
          /* ── Member / visitor view ──────────────────────────────────── */
          <section className="flex flex-col gap-4">
            {myMembership ? (
              myMembership.membershipStatus === 'approved' ? (
                <p className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                  Eres miembro de este grupo.
                </p>
              ) : (
                <p className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Tu solicitud está pendiente de aprobación.
                </p>
              )
            ) : group.visibility === 'public' ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Este es un grupo público. Puedes solicitar unirte; un manager
                  aprobará tu solicitud.
                </p>
                <JoinButton groupId={id} />
              </div>
            ) : (
              <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
                Este grupo es privado. Pide a un manager que te añada.
              </p>
            )}
          </section>
        )}
      </PageContainer>
    </main>
  );
}
