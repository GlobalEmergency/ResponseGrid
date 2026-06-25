import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RegisterResource } from '../../application/register-resource';
import { VerifyResource } from '../../application/verify-resource';
import { PublishResource } from '../../application/publish-resource';
import { RegisterResourceDto, VerifyResourceDto } from './dto';
import { RegisterResourceResponseDto } from './response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { RequireAnyCoordinatorGuard } from '../../../identity/infrastructure/http/require-any-coordinator.guard';
import { AuthenticatedUser } from '../../../identity/infrastructure/http/jwt-auth.guard';

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
  @ApiOperation({ summary: 'Register a resource for an emergency (public — citizen self-registration)' })
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
  @UseGuards(JwtAuthGuard, RequireAnyCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a resource (coordinator only)' })
  @ApiParam({ name: 'resourceId', description: 'Resource UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource verified' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiBadRequestResponse({ description: 'Invalid verification level or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async verifyResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: VerifyResourceDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const coordinatorId = req.user?.id ?? 'unknown';
    await this.verify.execute({ resourceId, level: dto.level, coordinatorId });
  }

  @Post('resources/:resourceId/publish')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RequireAnyCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a resource (coordinator only)' })
  @ApiParam({ name: 'resourceId', description: 'Resource UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource published' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({ description: 'Resource not verified yet' })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async publishResource(@Param('resourceId', ParseUUIDPipe) resourceId: string): Promise<void> {
    await this.publish.execute({ resourceId });
  }
}
