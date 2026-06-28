import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { GetCoordinationQueue } from '../../application/get-coordination-queue';
import {
  GetDisputedResources,
  DisputedResourceView,
} from '../../application/get-disputed-resources';
import { PagedResourcesDto, DisputedResourceDto } from './response.dto';
import { CoordinationQueueQueryDto } from './dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';

@ApiTags('resources')
@Controller()
export class CoordinationController {
  constructor(
    private readonly queue: GetCoordinationQueue,
    private readonly disputed: GetDisputedResources,
  ) {}

  @Get('emergencies/:emergencyId/coordination/queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get the verification queue for an emergency (paginated + searchable)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Paged list of resources pending verification',
    type: PagedResourcesDto,
  })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Coordinator role required for this emergency',
  })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: CoordinationQueueQueryDto,
  ): Promise<PagedResourcesDto> {
    return this.queue.execute({
      emergencyId,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      ...(query.type !== undefined && { type: query.type }),
      ...(query.q !== undefined && query.q !== '' && { q: query.q }),
    });
  }

  @Get('emergencies/:emergencyId/coordination/disputed')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List resources flagged as disputed by citizens, with a reason breakdown',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Disputed resources for the emergency',
    type: DisputedResourceDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Coordinator role required for this emergency',
  })
  async disputedQueue(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<DisputedResourceView[]> {
    return this.disputed.execute({ emergencyId });
  }
}
