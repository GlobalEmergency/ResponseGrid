import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { SearchAddress } from '../../application/search-address';
import { GeocodeResultDto } from './geocode-result.dto';
import { GeocodeResult } from '../../domain/ports/geocoding.provider';

@ApiTags('geocoding')
@Controller('geocode')
export class GeocodingController {
  constructor(private readonly searchAddress: SearchAddress) {}

  @Get()
  // This endpoint proxies an unauthenticated free-text query to the external
  // Nominatim service, whose usage policy forbids heavy automated traffic.
  // A tight per-IP cap protects both our API (DoS) and our upstream reputation
  // (getting the server IP banned would break geocoding for everyone).
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Geocode a free-text address query (Nominatim / OpenStreetMap)',
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiQuery({
    name: 'q',
    description: 'Address or place name to search',
    example: 'Madrid',
  })
  @ApiOkResponse({
    description:
      'Geocoding results (empty array when query is shorter than 3 characters)',
    type: GeocodeResultDto,
    isArray: true,
  })
  async search(@Query('q') q = ''): Promise<GeocodeResult[]> {
    return this.searchAddress.execute({ query: q });
  }
}
