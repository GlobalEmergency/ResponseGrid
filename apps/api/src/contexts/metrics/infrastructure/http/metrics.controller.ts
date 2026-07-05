import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { GetEmergencyMetrics } from '../../application/get-emergency-metrics';
import { EmergencyMetricsDto } from './response.dto';
import type { EmergencyMetrics } from '../../application/get-emergency-metrics';

@ApiTags('metrics')
@Controller()
// Public metrics: only the `default` 200/min throttler, not the specialized
// auth/intake/trusted-auth buckets the global guard leaks onto every route (#331).
@SkipThrottle({ auth: true, intake: true, 'trusted-auth': true })
export class MetricsController {
  constructor(private readonly getEmergencyMetrics: GetEmergencyMetrics) {}

  @Get('emergencies/:emergencyId/metrics')
  @ApiOperation({ summary: 'Get aggregated metrics for an emergency (public)' })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Emergency metrics summary',
    type: EmergencyMetricsDto,
  })
  async metrics(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<EmergencyMetrics> {
    return this.getEmergencyMetrics.execute({ emergencyId });
  }
}
