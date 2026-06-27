import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { GetPublicResources } from '../../application/get-public-resources';
import { GetResourceFacets } from '../../application/get-resource-facets';
import { PagedResourcesDto, ResourceFacetsDto } from './response.dto';
import { PublicResourcesQueryDto } from './dto';

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(
    private readonly getPublicResources: GetPublicResources,
    private readonly getResourceFacets: GetResourceFacets,
  ) {}

  @Get('emergencies/:emergencyId/public/resources')
  @ApiOperation({
    summary:
      'List published resources for an emergency (paginated + filterable)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Paged list of published resources',
    type: PagedResourcesDto,
  })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: PublicResourcesQueryDto,
  ): Promise<PagedResourcesDto> {
    return this.getPublicResources.execute({
      emergencyId,
      page: query.page,
      limit: query.limit,
      category: query.category,
      country: query.country,
    });
  }

  @Get('emergencies/:emergencyId/public/resources/facets')
  @ApiOperation({
    summary:
      'Get facets (counts by category and country) for visible resources',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Facets for filtering visible resources',
    type: ResourceFacetsDto,
  })
  async facets(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ResourceFacetsDto> {
    return this.getResourceFacets.execute({ emergencyId });
  }
}
