import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  AUDIT_REPOSITORY,
  type AuditRepository,
  type AuditQueryFilters,
} from '../../domain/ports/audit.repository';
import { AuditListResponseDto, AuditQueryDto } from './audit.dto';
import { toAuditEntryDto } from './audit.mapper';

/**
 * Emergency-scoped audit log: the activity trail of everything that happened in
 * one emergency. Restricted to coordinators of THAT emergency (and platform
 * admins/operators) via `audit:read` resolved against the `:emergencyId` scope —
 * an emergency_verifier does not hold `audit:read`, so it gets 403. The
 * emergencyId filter is pinned to the path param, never the query, so a
 * coordinator can only ever read their own emergency's trail.
 */
@ApiTags('audit')
@Controller('emergencies/:emergencyId/audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({
  description: 'audit:read required (coordinator of this emergency)',
})
export class EmergencyAuditController {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly auditRepo: AuditRepository,
  ) {}

  @Get()
  @RequirePermission('audit:read')
  @ApiOperation({
    summary:
      'Activity trail for an emergency — coordinators of the emergency only',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({ type: AuditListResponseDto })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: AuditQueryDto,
  ): Promise<AuditListResponseDto> {
    const filters: AuditQueryFilters = {
      emergencyId,
      limit: query.limit ?? 100,
      offset: query.offset ?? 0,
    };
    if (query.actorUserId !== undefined)
      filters.actorUserId = query.actorUserId;
    if (query.entityType !== undefined) filters.entityType = query.entityType;

    const entries = await this.auditRepo.findAll(filters);
    const mapped = entries.map(toAuditEntryDto);

    return { entries: mapped, total: mapped.length };
  }
}
