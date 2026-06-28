import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import { CreateOrganization } from '../../application/create-organization';
import { ListMyOrganizations } from '../../application/list-my-organizations';
import { ListOrganizations } from '../../application/list-organizations';
import { ListOrganizationsAdmin } from '../../application/list-organizations-admin';
import { GetOrganizationAdminDetail } from '../../application/get-organization-admin-detail';
import { AddOrganizationMember } from '../../application/add-organization-member';
import { RemoveOrganizationMember } from '../../application/remove-organization-member';
import { ListOrganizationMembers } from '../../application/list-organization-members';
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
  OrganizationViewDto,
  AddMemberDto,
  OrganizationMemberDto,
  OrganizationAdminListItemDto,
  OrganizationAdminDetailDto,
} from './dto';
import { OrganizationExceptionFilter } from './organization-exception.filter';

type AuthedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('organizations')
@Controller('organizations')
@UseFilters(OrganizationExceptionFilter)
export class OrganizationsController {
  constructor(
    private readonly createOrganization: CreateOrganization,
    private readonly listMyOrganizations: ListMyOrganizations,
    private readonly listOrganizations: ListOrganizations,
    private readonly listOrganizationsAdmin: ListOrganizationsAdmin,
    private readonly getOrganizationAdminDetail: GetOrganizationAdminDetail,
    private readonly addOrganizationMember: AddOrganizationMember,
    private readonly removeOrganizationMember: RemoveOrganizationMember,
    private readonly listOrganizationMembers: ListOrganizationMembers,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new organization (authenticated users)' })
  @ApiCreatedResponse({
    description: 'Organization created',
    type: CreateOrganizationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @Request() req: AuthedRequest,
  ): Promise<CreateOrganizationResponseDto> {
    return this.createOrganization.execute({
      name: dto.name,
      type: dto.type,
      taxId: dto.taxId ?? null,
      contactEmail: dto.contactEmail ?? null,
      creatorUserId: req.user.id,
    });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List organizations the authenticated user belongs to',
  })
  @ApiOkResponse({
    description: 'User organizations',
    type: [OrganizationViewDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async mine(@Request() req: AuthedRequest): Promise<OrganizationViewDto[]> {
    return this.listMyOrganizations.execute({ userId: req.user.id });
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations (public)' })
  @ApiOkResponse({
    description: 'All organizations',
    type: [OrganizationViewDto],
  })
  async list(): Promise<OrganizationViewDto[]> {
    return this.listOrganizations.execute();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('org:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin global list of ALL organizations, enriched with member count ' +
      'and accreditation status (org:read)',
  })
  @ApiOkResponse({
    description: 'All organizations (admin view)',
    type: [OrganizationAdminListItemDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing org:read permission' })
  async listAdmin(): Promise<OrganizationAdminListItemDto[]> {
    return this.listOrganizationsAdmin.execute();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('org:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin detail of one organization: members, service accounts/API ' +
      'keys, accreditations and emergencies (org:read)',
  })
  @ApiOkResponse({
    description: 'Organization detail (admin view)',
    type: OrganizationAdminDetailDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing org:read permission' })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async detail(@Param('id') id: string): Promise<OrganizationAdminDetailDto> {
    return this.getOrganizationAdminDetail.execute({ organizationId: id });
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List members of an organization (must be a member)',
  })
  @ApiOkResponse({
    description: 'Organization members',
    type: [OrganizationMemberDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a member of this organization' })
  async listMembers(
    @Param('id') id: string,
    @Request() req: AuthedRequest,
  ): Promise<OrganizationMemberDto[]> {
    return this.listOrganizationMembers.execute({
      organizationId: id,
      requesterUserId: req.user.id,
    });
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a member to an organization (owner only)' })
  @ApiCreatedResponse({ description: 'Member added' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only the owner can add members' })
  @ApiNotFoundResponse({ description: 'User not found by email' })
  @ApiConflictResponse({ description: 'User is already a member' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Request() req: AuthedRequest,
  ): Promise<void> {
    await this.addOrganizationMember.execute({
      organizationId: id,
      requesterUserId: req.user.id,
      email: dto.email,
    });
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a member from an organization (owner only)',
  })
  @ApiNoContentResponse({ description: 'Member removed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only the owner can remove members' })
  @ApiNotFoundResponse({ description: 'Member not found' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthedRequest,
  ): Promise<void> {
    await this.removeOrganizationMember.execute({
      organizationId: id,
      requesterUserId: req.user.id,
      targetUserId: userId,
    });
  }
}
