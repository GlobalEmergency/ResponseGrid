import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { RegisterResource } from '../../application/register-resource';
import { VerifyResource } from '../../application/verify-resource';
import { PublishResource } from '../../application/publish-resource';
import { RegisterResourceDto, VerifyResourceDto } from './dto';
import { currentCoordinatorId } from '../../../../shared/current-coordinator';

@Controller()
export class ResourcesController {
  constructor(
    private readonly register: RegisterResource,
    private readonly verify: VerifyResource,
    private readonly publish: PublishResource,
  ) {}

  @Post('emergencies/:emergencyId/resources')
  @HttpCode(201)
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: RegisterResourceDto,
  ): Promise<{ id: string }> {
    return this.register.execute({ emergencyId, type: dto.type, side: dto.side, name: dto.name });
  }

  @Post('resources/:resourceId/verify')
  @HttpCode(204)
  async verifyResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: VerifyResourceDto,
  ): Promise<void> {
    await this.verify.execute({ resourceId, level: dto.level, coordinatorId: currentCoordinatorId() });
  }

  @Post('resources/:resourceId/publish')
  @HttpCode(204)
  async publishResource(@Param('resourceId', ParseUUIDPipe) resourceId: string): Promise<void> {
    await this.publish.execute({ resourceId });
  }
}
