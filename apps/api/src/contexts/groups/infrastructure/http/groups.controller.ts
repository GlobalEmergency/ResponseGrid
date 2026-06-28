import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { GroupVisibility, GroupOwnerScope } from '../../domain/group-enums';
import { CreateGroup } from '../../application/create-group';
import { RequestToJoin } from '../../application/request-to-join';
import { ApproveMember } from '../../application/approve-member';
import { AddMemberByEmail } from '../../application/add-member-by-email';
import { AssignGroupManager } from '../../application/assign-group-manager';
import { ListGroupMembers } from '../../application/list-group-members';
import { ListGroupsByOwner } from '../../application/list-groups-by-owner';
import { ListMyGroups } from '../../application/list-my-groups';
import { GetGroup } from '../../application/get-group';
import { GroupSnapshot } from '../../domain/group';
import {
  CreateGroupDto,
  AddMemberByEmailDto,
  AssignManagerDto,
  ListGroupsQueryDto,
} from './groups-dto';
import { GroupExceptionFilter } from './group-exception.filter';

class IdResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

class GroupResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['public', 'private'] })
  visibility!: string;

  @ApiProperty({ enum: ['organization', 'emergency'] })
  ownerKind!: string;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  parentGroupId!: string | null;

  @ApiProperty()
  createdAt!: string;
}

class MyGroupResponseDto extends GroupResponseDto {
  @ApiProperty({ enum: ['pending', 'approved'] })
  membershipStatus!: string;
}

function toGroupResponse(g: GroupSnapshot): GroupResponseDto {
  return {
    id: g.id,
    name: g.name,
    visibility: g.visibility,
    ownerKind: g.ownerScope.kind,
    ownerId:
      g.ownerScope.kind === 'organization'
        ? g.ownerScope.organizationId
        : g.ownerScope.emergencyId,
    parentGroupId: g.parentGroupId,
    createdAt: g.createdAt,
  };
}

class GroupMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: ['pending', 'approved'] })
  status!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  addedByUserId!: string | null;
}

function ownerScopeOf(
  kind: 'organization' | 'emergency',
  id: string,
): GroupOwnerScope {
  return kind === 'organization'
    ? { kind: 'organization', organizationId: id }
    : { kind: 'emergency', emergencyId: id };
}

/**
 * Groups / cuadrillas. Authentication is by JWT; *authorization* happens in the
 * use cases against the group's `[group → owner → platform]` scope chain (so a
 * group manager or an org/emergency admin above it both qualify). See
 * docs/features/13 §6.
 */
@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(GroupExceptionFilter)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroup: CreateGroup,
    private readonly requestToJoin: RequestToJoin,
    private readonly approveMember: ApproveMember,
    private readonly addMemberByEmail: AddMemberByEmail,
    private readonly assignGroupManager: AssignGroupManager,
    private readonly listGroupMembers: ListGroupMembers,
    private readonly listGroupsByOwner: ListGroupsByOwner,
    private readonly listMyGroups: ListMyGroups,
    private readonly getGroup: GetGroup,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'List the groups I belong to (any status)' })
  @ApiOkResponse({ type: [MyGroupResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async mine(
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<MyGroupResponseDto[]> {
    const mine = await this.listMyGroups.execute(req.user!.id);
    return mine.map((x) => ({
      ...toGroupResponse(x.group),
      membershipStatus: x.status,
    }));
  }

  @Get()
  @ApiOperation({
    summary:
      'List groups under an org/emergency (all if you can read; else public)',
  })
  @ApiOkResponse({ type: [GroupResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async list(
    @Query() query: ListGroupsQueryDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<GroupResponseDto[]> {
    const user = req.user!;
    const groups = await this.listGroupsByOwner.execute({
      actor: { principalId: user.id, grants: user.grants },
      owner: ownerScopeOf(query.ownerKind, query.ownerId),
    });
    return groups.map(toGroupResponse);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get a group’s basic info' })
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async getOne(
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.getGroup.execute(groupId);
    return toGroupResponse(group);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a group (creator becomes its first manager)',
  })
  @ApiCreatedResponse({ type: IdResponseDto })
  @ApiForbiddenResponse({
    description: 'group:create required in the owner scope',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async create(
    @Body() dto: CreateGroupDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<IdResponseDto> {
    const user = req.user!;
    return this.createGroup.execute({
      actor: { principalId: user.id, grants: user.grants },
      name: dto.name,
      visibility: dto.visibility as GroupVisibility,
      ownerScope: ownerScopeOf(dto.ownerKind, dto.ownerId),
      parentGroupId: dto.parentGroupId ?? null,
    });
  }

  @Post(':groupId/join')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request to join a public group (awaits approval)' })
  @ApiNoContentResponse({ description: 'Join request registered' })
  @ApiForbiddenResponse({ description: 'Group is private' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async join(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    await this.requestToJoin.execute({
      actorUserId: req.user!.id,
      groupId,
    });
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'List a group’s members' })
  @ApiOkResponse({ type: [GroupMemberResponseDto] })
  @ApiForbiddenResponse({ description: 'group:read required' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async members(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<GroupMemberResponseDto[]> {
    const user = req.user!;
    const members = await this.listGroupMembers.execute({
      actor: { principalId: user.id, grants: user.grants },
      groupId,
    });
    return members.map((m) => ({
      userId: m.userId,
      status: m.status,
      addedByUserId: m.addedByUserId,
    }));
  }

  @Post(':groupId/members')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a member by email (manager only)' })
  @ApiCreatedResponse({ type: GroupMemberResponseDto })
  @ApiForbiddenResponse({ description: 'group:manage_members required' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async addMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AddMemberByEmailDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<GroupMemberResponseDto> {
    const user = req.user!;
    const { userId } = await this.addMemberByEmail.execute({
      actor: { principalId: user.id, grants: user.grants },
      groupId,
      email: dto.email,
    });
    return { userId, status: 'approved', addedByUserId: user.id };
  }

  @Post(':groupId/members/:userId/approve')
  @HttpCode(204)
  @ApiOperation({ summary: 'Approve a pending member (manager only)' })
  @ApiNoContentResponse({ description: 'Member approved' })
  @ApiForbiddenResponse({ description: 'group:manage_members required' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async approve(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const user = req.user!;
    await this.approveMember.execute({
      actor: { principalId: user.id, grants: user.grants },
      groupId,
      userId,
    });
  }

  @Post(':groupId/managers')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Appoint a member as co-manager (delegated, attenuated)',
  })
  @ApiCreatedResponse({ type: IdResponseDto })
  @ApiForbiddenResponse({
    description: 'role:grant required, or privilege escalation',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async assignManager(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AssignManagerDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<IdResponseDto> {
    const user = req.user!;
    return this.assignGroupManager.execute({
      actor: { principalId: user.id, grants: user.grants },
      groupId,
      userId: dto.userId,
    });
  }
}
