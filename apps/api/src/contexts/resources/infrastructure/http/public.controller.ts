import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { GetPublicResources } from '../../application/get-public-resources';
import { GetResourceFacets } from '../../application/get-resource-facets';
import { GetNearbyResources } from '../../application/get-nearby-resources';
import {
  PagedResourcesDto,
  ResourceFacetsDto,
  NearbyResourcesResponseDto,
} from './response.dto';
import { PublicResourcesQueryDto, NearbyResourcesQueryDto } from './dto';

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(
    private readonly getPublicResources: GetPublicResources,
    private readonly getResourceFacets: GetResourceFacets,
    private readonly getNearbyResources: GetNearbyResources,
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
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      ...(query.category !== undefined && { category: query.category }),
      ...(query.country !== undefined && { country: query.country }),
    });
  }

  @Get('emergencies/:emergencyId/public/resources/nearby')
  @ApiOperation({
    summary: 'Find visible resources near a GPS point, ordered by distance',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Resources within radius ordered by distance',
    type: NearbyResourcesResponseDto,
  })
  async nearby(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: NearbyResourcesQueryDto,
  ): Promise<NearbyResourcesResponseDto> {
    return this.getNearbyResources.execute({
      emergencyId,
      lat: query.lat,
      lng: query.lng,
      radiusMeters: query.radius,
      limit: query.limit ?? 50,
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
