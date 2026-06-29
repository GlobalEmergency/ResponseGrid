import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ListResourcesAdmin } from '../../application/list-resources-admin';
import { GetResourceAdminDetail } from '../../application/get-resource-admin-detail';
import { ResourceValidityReportSnapshot } from '../../domain/resource-validity-report';
import {
  PagedAdminResourcesDto,
  ResourceAdminDetailDto,
  ValidityReportDto,
} from './response.dto';
import { AdminResourcesQueryDto } from './dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';

/**
 * Platform-admin console for centers/resources (#177): the cross-emergency list
 * of ALL resources (every status + verification level) and the detail of any
 * single one, published or not. Distinct from the per-emergency coordination
 * queue and the public (verified/visible-only) read.
 *
 * Authorization: `resource:read`. The default scope chain for these routes is
 * `[platform]` — the list is param-less and the detail uses an `:id` param (NOT
 * `:resourceId`, which the entity-aware resolver would expand to
 * `[entity, emergency, platform]` and thus admit an emergency coordinator). So
 * only a platform-scoped grant (`platform_admin`) passes, mirroring the `/users`
 * admin console (#176).
 */
@ApiTags('resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('resources')
export class AdminResourcesController {
  constructor(
    private readonly listResources: ListResourcesAdmin,
    private readonly getDetail: GetResourceAdminDetail,
  ) {}

  @Get()
  @RequirePermission('resource:read')
  @ApiOperation({
    summary:
      'Admin global list of ALL resources — every emergency, status and ' +
      'verification level (resource:read at platform scope — admin only)',
  })
  @ApiOkResponse({ type: PagedAdminResourcesDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing resource:read at platform' })
  async list(
    @Query() query: AdminResourcesQueryDto,
  ): Promise<PagedAdminResourcesDto> {
    return this.listResources.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      ...(query.emergencyId !== undefined && {
        emergencyId: query.emergencyId,
      }),
      ...(query.type !== undefined && { type: query.type }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.verification !== undefined && {
        verification: query.verification,
      }),
      ...(query.q !== undefined && query.q !== '' && { q: query.q }),
    });
  }

  // Param is named `id` (NOT `resourceId`) on purpose: the entity-aware scope
  // resolver only expands `:resourceId` to the owning emergency. Keeping it `id`
  // leaves the chain at `[platform]`, so the route stays platform-admin-only.
  @Get(':id')
  @RequirePermission('resource:read')
  @ApiOperation({
    summary:
      'Admin detail of one resource of ANY status, with declared inventory ' +
      'and citizen validity reports (resource:read at platform scope — admin only)',
  })
  @ApiOkResponse({ type: ResourceAdminDetailDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing resource:read at platform' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResourceAdminDetailDto> {
    const result = await this.getDetail.execute({ resourceId: id });
    if (result === null) {
      throw new NotFoundException('Resource not found');
    }
    return {
      ...result.resource,
      validityReports: result.validityReports.map(toValidityReportDto),
    };
  }
}

/** Serialize a validity-report snapshot (Date fields → ISO strings) for the DTO. */
function toValidityReportDto(
  s: ResourceValidityReportSnapshot,
): ValidityReportDto {
  return {
    id: s.id,
    resourceId: s.resourceId,
    emergencyId: s.emergencyId,
    reporterUserId: s.reporterUserId,
    reason: s.reason,
    note: s.note,
    photoUrls: s.photoUrls,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    resolvedByUserId: s.resolvedByUserId,
    resolvedAt: s.resolvedAt ? s.resolvedAt.toISOString() : null,
  };
}
