import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
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

@ApiTags('audit')
@Controller('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'audit:read required' })
export class AuditController {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly auditRepo: AuditRepository,
  ) {}

  @Get()
  @RequirePermission('audit:read')
  @ApiOperation({ summary: 'List audit log entries (audit:read)' })
  @ApiOkResponse({ type: AuditListResponseDto })
  async list(@Query() query: AuditQueryDto): Promise<AuditListResponseDto> {
    const filters: AuditQueryFilters = {
      limit: query.limit ?? 100,
      offset: query.offset ?? 0,
    };
    if (query.emergencyId !== undefined)
      filters.emergencyId = query.emergencyId;
    if (query.actorUserId !== undefined)
      filters.actorUserId = query.actorUserId;
    if (query.entityType !== undefined) filters.entityType = query.entityType;

    const entries = await this.auditRepo.findAll(filters);
    const mapped = entries.map(toAuditEntryDto);

    return { entries: mapped, total: mapped.length };
  }
}
