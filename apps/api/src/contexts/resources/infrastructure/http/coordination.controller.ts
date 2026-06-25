import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { GetCoordinationQueue } from '../../application/get-coordination-queue';
import { ResourceView } from '../../application/resource-view';
import { ResourceViewDto } from './response.dto';

@ApiTags('resources')
@Controller()
export class CoordinationController {
  constructor(private readonly queue: GetCoordinationQueue) {}

  @Get('emergencies/:emergencyId/coordination/queue')
  @ApiOperation({ summary: 'Get the coordination queue for an emergency' })
  @ApiParam({ name: 'emergencyId', description: 'Emergency UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'List of resources in queue', type: [ResourceViewDto] })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  async list(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResourceView[]> {
    return this.queue.execute({ emergencyId });
  }
}
