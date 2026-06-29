import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CreateNeed } from '../../application/create-need';
import { ValidateNeed } from '../../application/validate-need';
import { EditNeed, EditNeedCommand } from '../../application/edit-need';
import { DiscardNeed } from '../../application/discard-need';
import { GetPublicNeeds } from '../../application/get-public-needs';
import {
  GetNearbyNeeds,
  NearbyNeedView,
} from '../../application/get-nearby-needs';
import { GetNeedsInBounds } from '../../application/get-needs-in-bounds';
import { GetNeedsQueue } from '../../application/get-needs-queue';
import { AssignNeedManager } from '../../application/assign-need-manager';
import { RenewNeed, GetExpiredNeeds } from '../../application/renew-need';
import { SuggestVolunteersForNeed } from '../../application/suggest-volunteers-for-need';
import { CreateTaskFromNeed } from '../../application/create-task-from-need';
import { NeedView } from '../../application/need-view';
import { Category, Priority } from '../../domain/need-enums';
import {
  CreateNeedDto,
  AssignNeedManagerDto,
  CreateTaskFromNeedDto,
  NearbyNeedsQueryDto,
  InBoundsNeedsQueryDto,
  EditNeedDto,
  DiscardNeedDto,
} from './dto';
import { setAuditContext } from '../../../audit/infrastructure/http/audit-context';
import {
  CreateNeedResponseDto,
  NeedViewDto,
  NearbyNeedsResponseDto,
  InBoundsNeedsDto,
  VolunteerSuggestionDto,
  CreatedTaskFromNeedDto,
} from './response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { JwtOrApiKeyAuthGuard } from '../../../identity/infrastructure/http/jwt-or-api-key-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { ServiceAccountPermissionGuard } from '../../../identity/infrastructure/http/service-account-permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import { requireAuthorForServiceAccount } from '../../../identity/infrastructure/http/require-author-for-service-account';

interface AuthenticatedRequest extends Express.Request {
  user: {
    id: string;
    email: string;
    isAdmin: boolean;
    isServiceAccount: boolean;
  };
}

@ApiTags('needs')
@Controller()
export class NeedsController {
  constructor(
    private readonly createNeed: CreateNeed,
    private readonly validateNeed: ValidateNeed,
    private readonly editNeed: EditNeed,
    private readonly discardNeed: DiscardNeed,
    private readonly getPublicNeeds: GetPublicNeeds,
    private readonly getNearbyNeeds: GetNearbyNeeds,
    private readonly getNeedsInBounds: GetNeedsInBounds,
    private readonly getNeedsQueue: GetNeedsQueue,
    private readonly assignNeedManager: AssignNeedManager,
    private readonly renewNeed: RenewNeed,
    private readonly getExpiredNeeds: GetExpiredNeeds,
    private readonly suggestVolunteers: SuggestVolunteersForNeed,
    private readonly createTaskFromNeed: CreateTaskFromNeed,
  ) {}

  @Post('emergencies/:emergencyId/needs')
  @HttpCode(201)
  @UseGuards(JwtOrApiKeyAuthGuard, ServiceAccountPermissionGuard)
  @RequirePermission('need:create')
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Create a need for an emergency (authenticated requester)',
    description:
      'Open to any authenticated user (a citizen submits; a coordinator ' +
      'validates later). A trusted integration may also create on behalf of a ' +
      'third party with its service-account API key when it holds `need:create` ' +
      'and includes the `author` block (#235).',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Need created',
    type: CreateNeedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request body or UUID, or missing author for an API key',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' })
  @ApiForbiddenResponse({
    description: 'Service account lacks the need:create grant at this scope',
  })
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: CreateNeedDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CreateNeedResponseDto> {
    requireAuthorForServiceAccount(req.user, dto.author);
    return this.createNeed.execute({
      emergencyId,
      requesterUserId: req.user.id,
      requesterOrganizationId: dto.requesterOrganizationId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      location: {
        address: dto.location.address,
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
      },
      priority: dto.priority,
      items: dto.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit ?? null,
        category: i.category,
        presentation: i.presentation ?? null,
        expiresAt: i.expiresAt ?? null,
      })),
      requiredSkill: dto.requiredSkill ?? null,
      skillSpecialty: dto.skillSpecialty ?? null,
      requestedCount: dto.requestedCount ?? null,
      resourceId: dto.resourceId ?? null,
      author: dto.author ?? null,
    });
  }

  @Get('emergencies/:emergencyId/public/needs')
  @ApiOperation({ summary: 'List validated needs for an emergency (public)' })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'category',
    enum: Category,
    required: false,
    description:
      'Filter by item category (needs with at least one item of this category)',
  })
  @ApiQuery({
    name: 'priority',
    enum: Priority,
    required: false,
    description: 'Filter by need priority',
  })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    format: 'uuid',
    description: 'Filter to needs linked to this resource / final recipient',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size for pagination (1-100). Omit to return all.',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of items to skip (pagination). Defaults to 0.',
  })
  @ApiOkResponse({
    description: 'List of validated needs',
    type: [NeedViewDto],
  })
  async listPublic(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<NeedView[]> {
    const validCategory = Object.values(Category).includes(category as Category)
      ? (category as Category)
      : undefined;
    const validPriority = Object.values(Priority).includes(priority as Priority)
      ? (priority as Priority)
      : undefined;

    // Pagination is opt-in: only applied when a valid `limit` is supplied, so
    // existing callers that omit it still receive the full validated list.
    const parsedLimit =
      limit !== undefined
        ? Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100)
        : undefined;
    const parsedOffset =
      offset !== undefined
        ? Math.max(Number.parseInt(offset, 10) || 0, 0)
        : undefined;

    return this.getPublicNeeds.execute({
      emergencyId,
      ...(validCategory !== undefined && { category: validCategory }),
      ...(validPriority !== undefined && { priority: validPriority }),
      ...(resourceId !== undefined && { resourceId }),
      ...(parsedLimit !== undefined && { limit: parsedLimit }),
      ...(parsedOffset !== undefined && { offset: parsedOffset }),
    });
  }

  @Get('emergencies/:emergencyId/public/needs/nearby')
  @ApiOperation({
    summary:
      'List validated needs near a GPS point, ordered by distance (public, #57)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Validated needs within radius ordered by distance',
    type: NearbyNeedsResponseDto,
  })
  async listNearby(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: NearbyNeedsQueryDto,
  ): Promise<{ items: NearbyNeedView[] }> {
    return this.getNearbyNeeds.execute({
      emergencyId,
      lat: query.lat,
      lng: query.lng,
      radiusMeters: query.radius,
      limit: query.limit ?? 50,
    });
  }

  @Get('emergencies/:emergencyId/public/needs/in-bounds')
  @ApiOperation({
    summary: 'List validated needs within a geographic bounding box (public)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Validated needs within the bounding box',
    type: InBoundsNeedsDto,
  })
  async needsInBounds(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: InBoundsNeedsQueryDto,
  ): Promise<{ items: NeedView[] }> {
    return this.getNeedsInBounds.execute({
      emergencyId,
      minLat: query.minLat,
      minLng: query.minLng,
      maxLat: query.maxLat,
      maxLng: query.maxLng,
      limit: query.limit ?? 500,
    });
  }

  @Get('emergencies/:emergencyId/needs/queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending needs queue for an emergency (coordinator only)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'category',
    enum: Category,
    required: false,
    description:
      'Filter by item category (needs with at least one item of this category)',
  })
  @ApiQuery({
    name: 'priority',
    enum: Priority,
    required: false,
    description: 'Filter by need priority',
  })
  @ApiOkResponse({ description: 'List of pending needs', type: [NeedViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Coordinator role required for this emergency',
  })
  async listQueue(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ): Promise<NeedView[]> {
    const validCategory = Object.values(Category).includes(category as Category)
      ? (category as Category)
      : undefined;
    const validPriority = Object.values(Priority).includes(priority as Priority)
      ? (priority as Priority)
      : undefined;

    return this.getNeedsQueue.execute({
      emergencyId,
      ...(validCategory !== undefined && { category: validCategory }),
      ...(validPriority !== undefined && { priority: validPriority }),
    });
  }

  @Post('needs/:needId/validate')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:validate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Validate a need (coordinator of the need's emergency only)",
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Need validated' })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiBadRequestResponse({ description: 'Need is not in pending status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async validate(
    @Param('needId', ParseUUIDPipe) needId: string,
  ): Promise<void> {
    await this.validateNeed.execute({ needId });
  }

  @Patch('needs/:needId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:validate')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Edit a need during validation (validator/coordinator). Requires a reason; recorded in the audit trail.',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Need edited' })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiBadRequestResponse({
    description: 'Missing reason or need is in a terminal status',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Validator/coordinator role required' })
  async edit(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Body() dto: EditNeedDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const cmd: EditNeedCommand = { needId };
    if (dto.title !== undefined) cmd.title = dto.title;
    if (dto.description !== undefined) cmd.description = dto.description;
    if (dto.priority !== undefined) cmd.priority = dto.priority;

    const result = await this.editNeed.execute(cmd);
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
  }

  @Post('needs/:needId/discard')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:validate')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Discard a need during validation (validator/coordinator). Requires a reason; recorded in the audit trail.',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Need discarded (rejected)' })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiBadRequestResponse({
    description: 'Missing reason or need is not in pending status',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Validator/coordinator role required' })
  async discard(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Body() dto: DiscardNeedDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const result = await this.discardNeed.execute({ needId });
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
  }

  @Post('needs/:needId/assign-manager')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:prioritize')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Assign a managing organization to a need (coordinator of the need's emergency only)",
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Manager assigned' })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async assignManager(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Body() dto: AssignNeedManagerDto,
  ): Promise<void> {
    await this.assignNeedManager.execute({
      needId,
      organizationId: dto.organizationId,
    });
  }

  @Post('needs/:needId/renew')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:prioritize')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Renew a need (reset expiresAt to now+48h) — coordinator only',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Need renewed', type: NeedViewDto })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async renew(
    @Param('needId', ParseUUIDPipe) needId: string,
  ): Promise<NeedView> {
    return this.renewNeed.execute({ needId });
  }

  @Get('emergencies/:emergencyId/needs/expired')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('need:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List expired needs for an emergency (coordinator only)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'List of expired validated needs',
    type: [NeedViewDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async listExpired(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<NeedView[]> {
    return this.getExpiredNeeds.execute({ emergencyId });
  }

  // ── F05: GET /needs/:needId/volunteer-suggestions ─────────────────────────

  @Get('needs/:needId/volunteer-suggestions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('volunteer:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Suggest available volunteers for a personnel need (coordinator only)',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of suggestions (default 20)',
    type: Number,
  })
  @ApiOkResponse({
    description: 'List of suggested volunteers',
    type: [VolunteerSuggestionDto],
  })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async getVolunteerSuggestions(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Query('limit') limit?: string,
  ): Promise<VolunteerSuggestionDto[]> {
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;
    return this.suggestVolunteers.execute({
      needId,
      limit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
    });
  }

  // ── F05: POST /needs/:needId/create-task ─────────────────────────────────

  @Post('needs/:needId/create-task')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a task from a personnel need (coordinator only)',
    description:
      'Creates one Task linked to the need and optionally assigns volunteers. ' +
      'Reuses existing CreateTask / AssignVolunteerToTask logic.',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Task created and volunteers assigned',
    type: CreatedTaskFromNeedDto,
  })
  @ApiNotFoundResponse({ description: 'Need not found' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async createTask(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Body() dto: CreateTaskFromNeedDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CreatedTaskFromNeedDto> {
    return this.createTaskFromNeed.execute({
      needId,
      volunteerIds: dto.volunteerIds ?? [],
      dueDate: dto.dueDate,
      createdByUserId: req.user.id,
    });
  }
}
