import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
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
