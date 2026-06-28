import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  GROUP_REPOSITORY,
  GroupRepository,
} from '../domain/ports/group.repository';
import {
  GROUP_MEMBER_REPOSITORY,
  GroupMemberRepository,
} from '../domain/ports/group-member.repository';
import {
  GROUP_USER_DIRECTORY,
  GroupUserDirectory,
} from '../domain/ports/user-directory';
import {
  GRANT_REPOSITORY,
  GrantRepository,
} from '../../identity/domain/ports/grant.repository';
import { ACCESS_CONTROL } from '../../identity/domain/authorization/access-control';
import type { AccessControl } from '../../identity/domain/authorization/access-control';
import { DrizzleGroupRepository } from './drizzle/drizzle-group.repository';
import { DrizzleGroupMemberRepository } from './drizzle/drizzle-group-member.repository';
import { DrizzleGroupUserDirectory } from './drizzle/drizzle-group-user-directory';
import { CreateGroup } from '../application/create-group';
import { RequestToJoin } from '../application/request-to-join';
import { ApproveMember } from '../application/approve-member';
import { AddMemberByEmail } from '../application/add-member-by-email';
import { AssignGroupManager } from '../application/assign-group-manager';
import { ListGroupMembers } from '../application/list-group-members';
import { ListGroupsByOwner } from '../application/list-groups-by-owner';
import { ListMyGroups } from '../application/list-my-groups';
import { GetGroup } from '../application/get-group';
import { GroupsController } from './http/groups.controller';

const groupRepositoryProvider = {
  provide: GROUP_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): GroupRepository => new DrizzleGroupRepository(db),
};

const groupMemberRepositoryProvider = {
  provide: GROUP_MEMBER_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): GroupMemberRepository =>
    new DrizzleGroupMemberRepository(db),
};

const groupUserDirectoryProvider = {
  provide: GROUP_USER_DIRECTORY,
  inject: [DB],
  useFactory: (db: Db): GroupUserDirectory => new DrizzleGroupUserDirectory(db),
};

const createGroupProvider = {
  provide: CreateGroup,
  inject: [GROUP_REPOSITORY, GRANT_REPOSITORY, ACCESS_CONTROL],
  useFactory: (
    groups: GroupRepository,
    grants: GrantRepository,
    access: AccessControl,
  ) => new CreateGroup(groups, grants, access),
};

const requestToJoinProvider = {
  provide: RequestToJoin,
  inject: [GROUP_REPOSITORY, GROUP_MEMBER_REPOSITORY],
  useFactory: (groups: GroupRepository, members: GroupMemberRepository) =>
    new RequestToJoin(groups, members),
};

const approveMemberProvider = {
  provide: ApproveMember,
  inject: [GROUP_REPOSITORY, GROUP_MEMBER_REPOSITORY, ACCESS_CONTROL],
  useFactory: (
    groups: GroupRepository,
    members: GroupMemberRepository,
    access: AccessControl,
  ) => new ApproveMember(groups, members, access),
};

const addMemberByEmailProvider = {
  provide: AddMemberByEmail,
  inject: [
    GROUP_REPOSITORY,
    GROUP_MEMBER_REPOSITORY,
    GROUP_USER_DIRECTORY,
    ACCESS_CONTROL,
  ],
  useFactory: (
    groups: GroupRepository,
    members: GroupMemberRepository,
    directory: GroupUserDirectory,
    access: AccessControl,
  ) => new AddMemberByEmail(groups, members, directory, access),
};

const assignGroupManagerProvider = {
  provide: AssignGroupManager,
  inject: [
    GROUP_REPOSITORY,
    GROUP_MEMBER_REPOSITORY,
    GRANT_REPOSITORY,
    ACCESS_CONTROL,
  ],
  useFactory: (
    groups: GroupRepository,
    members: GroupMemberRepository,
    grants: GrantRepository,
    access: AccessControl,
  ) => new AssignGroupManager(groups, members, grants, access),
};

const listGroupMembersProvider = {
  provide: ListGroupMembers,
  inject: [GROUP_REPOSITORY, GROUP_MEMBER_REPOSITORY, ACCESS_CONTROL],
  useFactory: (
    groups: GroupRepository,
    members: GroupMemberRepository,
    access: AccessControl,
  ) => new ListGroupMembers(groups, members, access),
};

const listGroupsByOwnerProvider = {
  provide: ListGroupsByOwner,
  inject: [GROUP_REPOSITORY, ACCESS_CONTROL],
  useFactory: (groups: GroupRepository, access: AccessControl) =>
    new ListGroupsByOwner(groups, access),
};

const listMyGroupsProvider = {
  provide: ListMyGroups,
  inject: [GROUP_REPOSITORY, GROUP_MEMBER_REPOSITORY],
  useFactory: (groups: GroupRepository, members: GroupMemberRepository) =>
    new ListMyGroups(groups, members),
};

const getGroupProvider = {
  provide: GetGroup,
  inject: [GROUP_REPOSITORY],
  useFactory: (groups: GroupRepository) => new GetGroup(groups),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [GroupsController],
  providers: [
    groupRepositoryProvider,
    groupMemberRepositoryProvider,
    groupUserDirectoryProvider,
    createGroupProvider,
    requestToJoinProvider,
    approveMemberProvider,
    addMemberByEmailProvider,
    assignGroupManagerProvider,
    listGroupMembersProvider,
    listGroupsByOwnerProvider,
    listMyGroupsProvider,
    getGroupProvider,
  ],
})
export class GroupsModule {}
