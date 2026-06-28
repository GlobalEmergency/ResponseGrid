import {
  Body,
  Controller,
  Get,
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
  ApiOkResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RegisterResource } from '../../application/register-resource';
import { VerifyResource } from '../../application/verify-resource';
import { PublishResource } from '../../application/publish-resource';
import { UpdateResourcePublicStatus } from '../../application/update-resource-public-status';
import { GetMyResources } from '../../application/get-my-resources';
import { PublicStatus } from '../../domain/resource-enums';
import {
  RegisterResourceDto,
  VerifyResourceDto,
  UpdateResourcePublicStatusDto,
} from './dto';
import { RegisterResourceResponseDto, ResourceViewDto } from './response.dto';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import { ResourceView } from '../../application/resource-view';

@ApiTags('resources')
@Controller()
export class ResourcesController {
  constructor(
    private readonly register: RegisterResource,
    private readonly verify: VerifyResource,
    private readonly publish: PublishResource,
    private readonly updateStatus: UpdateResourcePublicStatus,
    private readonly getMyResources: GetMyResources,
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
      contact: dto.contact ?? null,
      schedule: dto.schedule ?? null,
      manager: dto.manager ?? null,
      accepts: dto.accepts ?? [],
      country: dto.country ?? null,
      city: dto.city ?? null,
    });
  }

  @Post('resources/:resourceId/verify')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:verify')
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:edit')
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

  @Post('resources/:resourceId/status')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update the operational public status of a resource (owner or coordinator)',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Status updated' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiBadRequestResponse({ description: 'Invalid status transition or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not authorized to update this resource status',
  })
  async updateResourceStatus(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: UpdateResourcePublicStatusDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const statusMap: Record<string, PublicStatus> = {
      active: PublicStatus.Active,
      saturated: PublicStatus.Saturated,
      paused: PublicStatus.Paused,
      closed: PublicStatus.Closed,
    };
    await this.updateStatus.execute({
      resourceId,
      targetStatus: statusMap[dto.status],
      requesterUserId: req.user!.id,
    });
  }

  @Get('emergencies/:emergencyId/resources/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List resources owned by the authenticated user in an emergency',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'List of own resources',
    type: ResourceViewDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async listMyResources(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<ResourceView[]> {
    return this.getMyResources.execute({
      emergencyId,
      userId: req.user!.id,
    });
  }
}
