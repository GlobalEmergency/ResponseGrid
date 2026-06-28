import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ResourceView } from '../../application/resource-view';
import { ResourceViewDto } from './response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';

@ApiTags('resources')
@Controller()
export class CoordinationController {
  constructor(private readonly queue: GetCoordinationQueue) {}

  @Get('emergencies/:emergencyId/coordination/queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the coordination queue for an emergency (coordinator only)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'List of resources in queue',
    type: [ResourceViewDto],
  })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Coordinator role required for this emergency',
  })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ResourceView[]> {
    return this.queue.execute({ emergencyId });
  }
}
