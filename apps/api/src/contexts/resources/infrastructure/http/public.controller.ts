import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { GetPublicResources } from '../../application/get-public-resources';
import { GetResourceFacets } from '../../application/get-resource-facets';
import { GetNearbyResources } from '../../application/get-nearby-resources';
import { GetResourcesInBounds } from '../../application/get-resources-in-bounds';
import { GetPublicResource } from '../../application/get-public-resource';
import { ResourceDetailView } from '../../application/resource-view';
import {
  PagedResourcesDto,
  ResourceFacetsDto,
  NearbyResourcesResponseDto,
  InBoundsResourcesDto,
  ResourceDetailViewDto,
} from './response.dto';
import {
  PublicResourcesQueryDto,
  NearbyResourcesQueryDto,
  InBoundsQueryDto,
} from './dto';

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(
    private readonly getPublicResources: GetPublicResources,
    private readonly getResourceFacets: GetResourceFacets,
    private readonly getNearbyResources: GetNearbyResources,
    private readonly getResourcesInBounds: GetResourcesInBounds,
    private readonly getPublicResource: GetPublicResource,
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
      ...(query.q !== undefined && query.q !== '' && { q: query.q }),
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

  @Get('emergencies/:emergencyId/public/resources/in-bounds')
  @ApiOperation({
    summary: 'Find visible resources within a geographic bounding box',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Resources within the bounding box',
    type: InBoundsResourcesDto,
  })
  async inBounds(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: InBoundsQueryDto,
  ): Promise<InBoundsResourcesDto> {
    return this.getResourcesInBounds.execute({
      emergencyId,
      minLat: query.minLat,
      minLng: query.minLng,
      maxLat: query.maxLat,
      maxLng: query.maxLng,
      limit: query.limit ?? 500,
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

  // Declared AFTER the static nearby/in-bounds/facets routes so those match
  // first; this param route catches the remaining resource ids.
  @Get('emergencies/:emergencyId/public/resources/:resourceId')
  @ApiOperation({ summary: 'Get a single published resource by id' })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'The published resource',
    type: ResourceDetailViewDto,
  })
  @ApiNotFoundResponse({ description: 'Resource not found or not public' })
  async getOne(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<ResourceDetailView> {
    const resource = await this.getPublicResource.execute({
      emergencyId,
      resourceId,
    });
    if (resource === null) {
      throw new NotFoundException('Resource not found');
    }
    return resource;
  }
}
