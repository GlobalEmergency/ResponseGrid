import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  EditResource,
  EditResourceCommand,
} from '../../application/edit-resource';
import { DiscardResource } from '../../application/discard-resource';
import { ReportResourceValidity } from '../../application/report-resource-validity';
import { ResolveResourceDispute } from '../../application/resolve-resource-dispute';
import { GetResourceValidityReports } from '../../application/get-resource-validity-reports';
import { PublicStatus } from '../../domain/resource-enums';
import { ResourceValidityReportSnapshot } from '../../domain/resource-validity-report';
import {
  RegisterResourceDto,
  VerifyResourceDto,
  UpdateResourcePublicStatusDto,
  EditResourceDto,
  DiscardResourceDto,
  ReportResourceValidityDto,
  ResolveResourceDisputeDto,
} from './dto';
import { setAuditContext } from '../../../audit/infrastructure/http/audit-context';
import {
  RegisterResourceResponseDto,
  ResourceViewDto,
  ReportResourceValidityResponseDto,
  ValidityReportDto,
} from './response.dto';
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
    private readonly editResource: EditResource,
    private readonly discardResource: DiscardResource,
    private readonly reportValidity: ReportResourceValidity,
    private readonly resolveDispute: ResolveResourceDispute,
    private readonly validityReports: GetResourceValidityReports,
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
      isFinalRecipient: dto.isFinalRecipient ?? false,
      recipientType: dto.recipientType ?? null,
      items: (dto.items ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit ?? null,
        category: i.category,
        presentation: i.presentation ?? null,
      })),
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
  @RequirePermission('resource:verify')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Publish a resource (verifier or coordinator of the resource's emergency)",
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

  @Patch('resources/:resourceId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:verify')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Edit a resource during verification (validator/coordinator). Requires a reason; recorded in the audit trail.',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Resource edited' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiBadRequestResponse({
    description: 'Missing reason or resource is discarded',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Validator/coordinator role required' })
  async editResourceFields(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: EditResourceDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const cmd: EditResourceCommand = { resourceId };
    if (dto.name !== undefined) cmd.name = dto.name;
    if (dto.description !== undefined) cmd.description = dto.description;
    if (dto.contact !== undefined) cmd.contact = dto.contact;
    if (dto.schedule !== undefined) cmd.schedule = dto.schedule;

    const result = await this.editResource.execute(cmd);
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
  }

  @Post('resources/:resourceId/discard')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:verify')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Discard a resource during verification (validator/coordinator). Requires a reason; recorded in the audit trail.',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Resource discarded' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiBadRequestResponse({
    description: 'Missing reason or resource is not pending verification',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Validator/coordinator role required' })
  async discardResourceAction(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: DiscardResourceDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const result = await this.discardResource.execute({ resourceId });
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
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

  @Post('resources/:resourceId/validity-reports')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Report a resource as closed / nonexistent / moved / outdated (any authenticated user)',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Report recorded',
    type: ReportResourceValidityResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({ description: 'Resource is not publicly visible' })
  @ApiForbiddenResponse({
    description: 'The owner cannot report their own resource',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async submitValidityReport(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: ReportResourceValidityDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<ReportResourceValidityResponseDto> {
    return this.reportValidity.execute({
      resourceId,
      reporterUserId: req.user!.id,
      reason: dto.reason,
      note: dto.note ?? null,
      photoUrls: dto.photoUrls ?? [],
    });
  }

  @Post('resources/:resourceId/dispute/resolve')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:edit')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Resolve a disputed resource (coordinator): confirm closure, mark invalid or dismiss. Requires a reason; recorded in the audit trail.',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Dispute resolved' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({ description: 'Resource is not disputed' })
  @ApiBadRequestResponse({
    description: 'Missing reason or invalid resolution',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async resolveDisputeAction(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: ResolveResourceDisputeDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const coordinatorId = req.user?.id ?? 'unknown';
    const result = await this.resolveDispute.execute({
      resourceId,
      coordinatorId,
      resolution: dto.resolution,
    });
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
  }

  @Get('resources/:resourceId/validity-reports')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('resource:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List the citizen validity reports of a resource (coordinator)',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Validity reports for the resource',
    type: ValidityReportDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async listValidityReports(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<ResourceValidityReportSnapshot[]> {
    return this.validityReports.execute({ resourceId });
  }
}
