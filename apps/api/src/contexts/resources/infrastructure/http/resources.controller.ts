import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { RegisterResource } from '../../application/register-resource';
import { VerifyResource } from '../../application/verify-resource';
import { PublishResource } from '../../application/publish-resource';
import { RegisterResourceDto, VerifyResourceDto } from './dto';
import { RegisterResourceResponseDto } from './response.dto';
import { currentCoordinatorId } from '../../../../shared/current-coordinator';

@ApiTags('resources')
@Controller()
export class ResourcesController {
  constructor(
    private readonly register: RegisterResource,
    private readonly verify: VerifyResource,
    private readonly publish: PublishResource,
  ) {}

  @Post('emergencies/:emergencyId/resources')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a resource for an emergency' })
  @ApiParam({ name: 'emergencyId', description: 'Emergency UUID', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Resource registered', type: RegisterResourceResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body or UUID' })
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: RegisterResourceDto,
  ): Promise<RegisterResourceResponseDto> {
    return this.register.execute({ emergencyId, type: dto.type, side: dto.side, name: dto.name });
  }

  @Post('resources/:resourceId/verify')
  @HttpCode(204)
  @ApiOperation({ summary: 'Verify a resource' })
  @ApiParam({ name: 'resourceId', description: 'Resource UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource verified' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiBadRequestResponse({ description: 'Invalid verification level or UUID' })
  async verifyResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: VerifyResourceDto,
  ): Promise<void> {
    await this.verify.execute({ resourceId, level: dto.level, coordinatorId: currentCoordinatorId() });
  }

  @Post('resources/:resourceId/publish')
  @HttpCode(204)
  @ApiOperation({ summary: 'Publish a resource' })
  @ApiParam({ name: 'resourceId', description: 'Resource UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource published' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({ description: 'Resource not verified yet' })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  async publishResource(@Param('resourceId', ParseUUIDPipe) resourceId: string): Promise<void> {
    await this.publish.execute({ resourceId });
  }
}
