import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { GetCoordinationQueue } from '../../application/get-coordination-queue';
import { ResourceView } from '../../application/resource-view';

@Controller()
export class CoordinationController {
  constructor(private readonly queue: GetCoordinationQueue) {}

  @Get('emergencies/:emergencyId/coordination/queue')
  async list(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResourceView[]> {
    return this.queue.execute({ emergencyId });
  }
}
