import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { GrantRole } from '../../application/grant-role';
import { RevokeGrant } from '../../application/revoke-grant';
import { ListGrantsAtScope } from '../../application/list-grants-at-scope';
import { ScopeRefProps } from '../../domain/authorization/scope-ref';
import { GrantSnapshot } from '../../domain/authorization/grant';
import { GRANT_REPOSITORY } from '../../domain/ports/grant.repository';
import type { GrantRepository } from '../../domain/ports/grant.repository';
import { GrantRoleDto } from './grants-dto';
import { GrantExceptionFilter } from './grant-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';
import { RequireAdminGuard } from './require-admin.guard';

class GrantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

class GrantListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  principalId!: string;

  @ApiProperty({ enum: ['user', 'service_account'] })
  principalType!: string;

  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  scopeType!: string;

  @ApiProperty({ type: String, nullable: true })
  scopeId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  grantedByPrincipalId!: string | null;

  @ApiProperty()
  grantedAt!: string;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Display name of the principal (when resolvable)',
  })
  principalName!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Email of the principal (users only)',
  })
  principalEmail!: string | null;
}

function buildScope(dto: GrantRoleDto): ScopeRefProps {
  switch (dto.scopeType) {
    case 'platform':
      return { type: 'platform' };
    case 'organization':
    case 'emergency':
    case 'group':
      if (!dto.scopeId) {
        throw new BadRequestException(
          `scopeId is required for scope '${dto.scopeType}'`,
        );
      }
      return { type: dto.scopeType, id: dto.scopeId };
    case 'entity':
      if (!dto.scopeId || !dto.scopeEntityType) {
        throw new BadRequestException(
          'scopeId and scopeEntityType are required for an entity scope',
        );
      }
      return {
        type: 'entity',
        id: dto.scopeId,
        entityType: dto.scopeEntityType,
      };
  }
}

/** Build a scope from `?scopeType=&scopeId=` for the scoped-listing endpoint. */
function buildScopeFromQuery(
  scopeType: string,
  scopeId?: string,
  scopeEntityType?: string,
): ScopeRefProps {
  if (scopeType === 'platform') return { type: 'platform' };
  if (
    scopeType === 'organization' ||
    scopeType === 'emergency' ||
    scopeType === 'group'
  ) {
    if (!scopeId) {
      throw new BadRequestException(
        `scopeId is required for scope '${scopeType}'`,
      );
    }
    return { type: scopeType, id: scopeId };
  }
  if (scopeType === 'entity') {
    if (!scopeId || !scopeEntityType) {
      throw new BadRequestException(
        'scopeId and scopeEntityType are required for an entity scope',
      );
    }
    return { type: 'entity', id: scopeId, entityType: scopeEntityType };
  }
  throw new BadRequestException(`unsupported scopeType '${scopeType}'`);
}

function toGrantListItem(
  s: GrantSnapshot,
  principalName: string | null = null,
  principalEmail: string | null = null,
): GrantListItemDto {
  return {
    id: s.id,
    principalId: s.principalId,
    principalType: s.principalType,
    roleId: s.roleId,
    scopeType: s.scope.type,
    scopeId: 'id' in s.scope ? s.scope.id : null,
    grantedByPrincipalId: s.grantedByPrincipalId,
    grantedAt: s.grantedAt,
    expiresAt: s.expiresAt,
    principalName,
    principalEmail,
  };
}

@ApiTags('grants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(GrantExceptionFilter)
@Controller('grants')
export class GrantsController {
  constructor(
    private readonly grantRole: GrantRole,
    private readonly revokeGrant: RevokeGrant,
    private readonly listGrantsAtScope: ListGrantsAtScope,
    @Inject(GRANT_REPOSITORY) private readonly grants: GrantRepository,
  ) {}

  @Get('at-scope')
  @ApiOperation({
    summary: 'List the grants made AT a scope (scoped administrator)',
  })
  @ApiQuery({
    name: 'scopeType',
    required: true,
    description: 'platform | organization | emergency | group | entity',
  })
  @ApiQuery({ name: 'scopeId', required: false })
  @ApiQuery({ name: 'scopeEntityType', required: false })
  @ApiOkResponse({ type: [GrantListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not authorized to administer this scope',
  })
  async listAtScope(
    @Query('scopeType') scopeType: string,
    @Req() req: Request & { user?: AuthenticatedUser },
    @Query('scopeId') scopeId?: string,
    @Query('scopeEntityType') scopeEntityType?: string,
  ): Promise<GrantListItemDto[]> {
    const user = req.user!;
    const views = await this.listGrantsAtScope.execute({
      actor: { principalId: user.id, grants: user.grants },
      scope: buildScopeFromQuery(scopeType, scopeId, scopeEntityType),
    });
    return views.map((v) =>
      toGrantListItem(v.grant, v.principalName, v.principalEmail),
    );
  }

  @Get()
  @UseGuards(RequireAdminGuard)
  @ApiOperation({ summary: 'List the grants held by a principal (admin)' })
  @ApiQuery({
    name: 'principalId',
    required: true,
    description: 'User or service-account id',
  })
  @ApiOkResponse({ type: [GrantListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async list(
    @Query('principalId') principalId: string,
  ): Promise<GrantListItemDto[]> {
    if (!principalId) {
      throw new BadRequestException('principalId query param is required');
    }
    const grants = await this.grants.findByPrincipal(principalId);
    return grants.map((g) => toGrantListItem(g.toSnapshot()));
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Grant a role to a principal in a scope (delegated, attenuated)',
  })
  @ApiCreatedResponse({ description: 'Role granted', type: GrantResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not authorized to grant, or privilege escalation',
  })
  async grant(
    @Body() dto: GrantRoleDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<{ id: string }> {
    const user = req.user!;
    return this.grantRole.execute({
      actor: { principalId: user.id, grants: user.grants },
      targetPrincipalId: dto.principalId,
      roleId: dto.roleId,
      scope: buildScope(dto),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a grant' })
  @ApiNoContentResponse({ description: 'Grant revoked' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not authorized to revoke' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const user = req.user!;
    await this.revokeGrant.execute({
      actor: { principalId: user.id, grants: user.grants },
      grantId: id,
    });
  }
}
