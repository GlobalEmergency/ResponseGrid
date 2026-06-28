import { CreateGroup } from './create-group';
import { RequestToJoin } from './request-to-join';
import { ApproveMember } from './approve-member';
import { AddMemberByEmail } from './add-member-by-email';
import { AssignGroupManager } from './assign-group-manager';
import { ListGroupMembers } from './list-group-members';
import { InMemoryGroupRepository } from '../infrastructure/in-memory-group.repository';
import { InMemoryGroupMemberRepository } from '../infrastructure/in-memory-group-member.repository';
import { InMemoryGroupUserDirectory } from '../infrastructure/in-memory-group-user-directory';
import { InMemoryGrantRepository } from '../../identity/infrastructure/in-memory-grant.repository';
import { LocalAccessControl } from '../../identity/domain/authorization/local-access-control';
import { AuthorizationContext } from '../../identity/domain/authorization/access-control';
import { Grant } from '../../identity/domain/authorization/grant';
import { ScopeRef } from '../../identity/domain/authorization/scope-ref';
import { GroupVisibility, GroupOwnerScope } from '../domain/group-enums';
import {
  AlreadyMemberError,
  GroupAccessDeniedError,
  GroupNotPublicError,
  GroupPrivilegeEscalationError,
  MemberNotFoundError,
  UserNotFoundByEmailError,
} from '../domain/errors';

const ORG = 'org-1';
const ADMIN = 'admin-1';
const MANAGER = 'manager-1';
const ALICE = 'alice-1';
const BOB = 'bob-1';

function ctx(principalId: string, grants: Grant[]): AuthorizationContext {
  return { principalId, grants: grants.map((g) => g.toSnapshot()) };
}

function orgAdmin(id: string): AuthorizationContext {
  return ctx(id, [
    Grant.create({
      id: `g-${id}`,
      principalId: id,
      roleId: 'org_admin',
      scope: ScopeRef.organization(ORG),
    }),
  ]);
}

function groupManager(id: string, groupId: string): AuthorizationContext {
  return ctx(id, [
    Grant.create({
      id: `gm-${id}-${groupId}`,
      principalId: id,
      roleId: 'group_manager',
      scope: ScopeRef.group(groupId),
    }),
  ]);
}

const orgOwner: GroupOwnerScope = { kind: 'organization', organizationId: ORG };

describe('Group use cases', () => {
  const access = new LocalAccessControl();
  let groups: InMemoryGroupRepository;
  let members: InMemoryGroupMemberRepository;
  let grants: InMemoryGrantRepository;
  let directory: InMemoryGroupUserDirectory;

  let createGroup: CreateGroup;
  let requestToJoin: RequestToJoin;
  let approveMember: ApproveMember;
  let addMemberByEmail: AddMemberByEmail;
  let assignGroupManager: AssignGroupManager;
  let listGroupMembers: ListGroupMembers;

  beforeEach(() => {
    groups = new InMemoryGroupRepository();
    members = new InMemoryGroupMemberRepository();
    grants = new InMemoryGrantRepository();
    directory = new InMemoryGroupUserDirectory();
    createGroup = new CreateGroup(groups, grants, access);
    requestToJoin = new RequestToJoin(groups, members);
    approveMember = new ApproveMember(groups, members, access);
    addMemberByEmail = new AddMemberByEmail(groups, members, directory, access);
    assignGroupManager = new AssignGroupManager(
      groups,
      members,
      grants,
      access,
    );
    listGroupMembers = new ListGroupMembers(groups, members, access);
  });

  async function aPublicGroup(): Promise<string> {
    const { id } = await createGroup.execute({
      actor: orgAdmin(ADMIN),
      name: 'Cuadrilla A',
      visibility: GroupVisibility.Public,
      ownerScope: orgOwner,
    });
    return id;
  }

  describe('CreateGroup', () => {
    it('an org_admin creates a group and is bootstrapped as its manager', async () => {
      const { id } = await createGroup.execute({
        actor: orgAdmin(ADMIN),
        name: 'Cuadrilla A',
        visibility: GroupVisibility.Private,
        ownerScope: orgOwner,
      });
      expect(await groups.findById(id)).not.toBeNull();
      const adminGrants = await grants.findByPrincipal(ADMIN);
      const bootstrap = adminGrants.find(
        (g) => g.roleId === 'group_manager' && g.scope.type === 'group',
      );
      expect(bootstrap).toBeDefined();
    });

    it('a principal without group:create is denied', async () => {
      await expect(
        createGroup.execute({
          actor: ctx('nobody', []),
          name: 'x',
          visibility: GroupVisibility.Private,
          ownerScope: orgOwner,
        }),
      ).rejects.toThrow(GroupAccessDeniedError);
    });
  });

  describe('RequestToJoin', () => {
    it('a user can self-request to join a public group (pending)', async () => {
      const groupId = await aPublicGroup();
      await requestToJoin.execute({ actorUserId: ALICE, groupId });
      const m = await members.find(groupId, ALICE);
      expect(m?.isApproved).toBe(false);
    });

    it('rejects self-request on a private group', async () => {
      const { id } = await createGroup.execute({
        actor: orgAdmin(ADMIN),
        name: 'Privada',
        visibility: GroupVisibility.Private,
        ownerScope: orgOwner,
      });
      await expect(
        requestToJoin.execute({ actorUserId: ALICE, groupId: id }),
      ).rejects.toThrow(GroupNotPublicError);
    });

    it('rejects a duplicate request', async () => {
      const groupId = await aPublicGroup();
      await requestToJoin.execute({ actorUserId: ALICE, groupId });
      await expect(
        requestToJoin.execute({ actorUserId: ALICE, groupId }),
      ).rejects.toThrow(AlreadyMemberError);
    });
  });

  describe('ApproveMember', () => {
    it('a manager approves a pending member', async () => {
      const groupId = await aPublicGroup();
      await requestToJoin.execute({ actorUserId: ALICE, groupId });
      await approveMember.execute({
        actor: groupManager(MANAGER, groupId),
        groupId,
        userId: ALICE,
      });
      const m = await members.find(groupId, ALICE);
      expect(m?.isApproved).toBe(true);
    });

    it('a non-manager cannot approve', async () => {
      const groupId = await aPublicGroup();
      await requestToJoin.execute({ actorUserId: ALICE, groupId });
      await expect(
        approveMember.execute({
          actor: ctx(BOB, []),
          groupId,
          userId: ALICE,
        }),
      ).rejects.toThrow(GroupAccessDeniedError);
    });
  });

  describe('AddMemberByEmail', () => {
    it('a manager adds an existing user by email (approved immediately)', async () => {
      const groupId = await aPublicGroup();
      directory.set('alice@example.com', ALICE);
      const { userId } = await addMemberByEmail.execute({
        actor: groupManager(MANAGER, groupId),
        groupId,
        email: 'alice@example.com',
      });
      expect(userId).toBe(ALICE);
      const m = await members.find(groupId, ALICE);
      expect(m?.isApproved).toBe(true);
    });

    it('rejects an unknown email', async () => {
      const groupId = await aPublicGroup();
      await expect(
        addMemberByEmail.execute({
          actor: groupManager(MANAGER, groupId),
          groupId,
          email: 'ghost@example.com',
        }),
      ).rejects.toThrow(UserNotFoundByEmailError);
    });
  });

  describe('AssignGroupManager', () => {
    it('a manager appoints an approved member as co-manager', async () => {
      const groupId = await aPublicGroup();
      directory.set('alice@example.com', ALICE);
      await addMemberByEmail.execute({
        actor: groupManager(MANAGER, groupId),
        groupId,
        email: 'alice@example.com',
      });
      const { id } = await assignGroupManager.execute({
        actor: groupManager(MANAGER, groupId),
        groupId,
        userId: ALICE,
      });
      expect(id).toBeDefined();
      const aliceGrants = await grants.findByPrincipal(ALICE);
      expect(
        aliceGrants.some(
          (g) => g.roleId === 'group_manager' && g.scope.type === 'group',
        ),
      ).toBe(true);
    });

    it('attenuation blocks an appointer who lacks the operational perms (org_admin not a manager)', async () => {
      const groupId = await aPublicGroup();
      directory.set('alice@example.com', ALICE);
      await addMemberByEmail.execute({
        actor: groupManager(MANAGER, groupId),
        groupId,
        email: 'alice@example.com',
      });
      // org_admin holds role:grant + group:manage_members but NOT the group_manager
      // operational perms (volunteer:assign, task:create…), so attenuation kicks in.
      await expect(
        assignGroupManager.execute({
          actor: orgAdmin(ADMIN),
          groupId,
          userId: ALICE,
        }),
      ).rejects.toThrow(GroupPrivilegeEscalationError);
    });

    it('cannot appoint a non-member', async () => {
      const groupId = await aPublicGroup();
      await expect(
        assignGroupManager.execute({
          actor: groupManager(MANAGER, groupId),
          groupId,
          userId: BOB,
        }),
      ).rejects.toThrow(MemberNotFoundError);
    });
  });

  describe('ListGroupMembers', () => {
    it('a manager lists members; a stranger is denied', async () => {
      const groupId = await aPublicGroup();
      await requestToJoin.execute({ actorUserId: ALICE, groupId });
      const list = await listGroupMembers.execute({
        actor: groupManager(MANAGER, groupId),
        groupId,
      });
      expect(list.some((m) => m.userId === ALICE)).toBe(true);
      await expect(
        listGroupMembers.execute({ actor: ctx(BOB, []), groupId }),
      ).rejects.toThrow(GroupAccessDeniedError);
    });
  });
});
