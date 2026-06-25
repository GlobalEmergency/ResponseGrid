import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { GetPublicResources } from '../../application/get-public-resources';
import { ResourceView } from '../../application/resource-view';
import { ResourceViewDto } from './response.dto';

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(private readonly getPublicResources: GetPublicResources) {}

  @Get('emergencies/:emergencyId/public/resources')
  @ApiOperation({ summary: 'List published (active) resources for an emergency' })
  @ApiParam({ name: 'emergencyId', description: 'Emergency UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'List of published resources', type: ResourceViewDto, isArray: true })
  async list(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResourceView[]> {
    return this.getPublicResources.execute({ emergencyId });
  }
}
