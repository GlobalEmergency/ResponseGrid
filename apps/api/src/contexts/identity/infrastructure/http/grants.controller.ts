import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { GrantRole } from '../../application/grant-role';
import { RevokeGrant } from '../../application/revoke-grant';
import { ScopeRefProps } from '../../domain/authorization/scope-ref';
import { GrantRoleDto } from './grants-dto';
import { GrantExceptionFilter } from './grant-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';

class GrantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
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

@ApiTags('grants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(GrantExceptionFilter)
@Controller('grants')
export class GrantsController {
  constructor(
    private readonly grantRole: GrantRole,
    private readonly revokeGrant: RevokeGrant,
  ) {}

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
