import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { RequireResourceCoordinatorGuard } from '../../../identity/infrastructure/http/require-resource-coordinator.guard';

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a resource for an emergency (requires authentication)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Resource registered',
    type: RegisterResourceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: RegisterResourceDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<RegisterResourceResponseDto> {
    const ownerUserId = req.user!.id;
    return this.register.execute({
      emergencyId,
      type: dto.type,
      stage: dto.stage,
      name: dto.name,
      description: dto.description ?? null,
      location: dto.location,
      ownerUserId,
      ownerOrganizationId: dto.ownerOrganizationId ?? null,
    });
  }

  @Post('resources/:resourceId/verify')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RequireResourceCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Verify a resource (coordinator of the resource's emergency only)",
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Resource verified' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiBadRequestResponse({ description: 'Invalid verification level or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async verifyResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() _dto: VerifyResourceDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const coordinatorId = req.user?.id ?? 'unknown';
    await this.verify.execute({ resourceId, coordinatorId });
  }

  @Post('resources/:resourceId/publish')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RequireResourceCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Publish a resource (coordinator of the resource's emergency only)",
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Resource published' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({ description: 'Resource not verified yet' })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async publishResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<void> {
    await this.publish.execute({ resourceId });
  }
}
