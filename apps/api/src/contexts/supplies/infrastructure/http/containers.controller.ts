import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CreateContainer } from '../../application/create-container';
import { AddLineToContainer } from '../../application/add-line-to-container';
import { RemoveLineFromContainer } from '../../application/remove-line-from-container';
import { NestContainer } from '../../application/nest-container';
import { SealContainer } from '../../application/seal-container';
import { MoveContainer } from '../../application/move-container';
import { GetContainer } from '../../application/get-container';
import { ListContainers } from '../../application/list-containers';
import {
  ContainerView,
  ContainerTreeView,
} from '../../application/container-view';
import {
  CreateContainerDto,
  ListContainersQueryDto,
  MoveContainerDto,
  NestContainerDto,
} from './container-dto';
import { SupplyLineDto } from './supply-line.dto';
import {
  ContainerTreeViewDto,
  ContainerViewDto,
  CreateContainerResponseDto,
} from './container-response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  CONTAINER_AUTHORIZATION_LOOKUP,
  type ContainerAuthorizationLookup,
} from '../../domain/ports/container-authorization-lookup';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../identity/domain/ports/membership.repository';
import { UserId } from '../../../identity/domain/user-id';
import { Role } from '../../../identity/domain/role';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string; email: string; isAdmin: boolean };
}

/**
 * Trackable containers (palet/caja/lote) — #140. Management is gated on
 * coordinator membership of the container's emergency (mirroring the shipment
 * controller: the write routes carry no scope-resolvable param, so the global
 * PermissionGuard would fall back to the platform scope and 403 a legitimate
 * coordinator). The emergency-scoped list uses the PermissionGuard with
 * `container:read`.
 */
@ApiTags('supplies')
@Controller()
export class ContainerController {
  constructor(
    private readonly createContainer: CreateContainer,
    private readonly addLineToContainer: AddLineToContainer,
    private readonly removeLineFromContainer: RemoveLineFromContainer,
    private readonly nestContainer: NestContainer,
    private readonly sealContainer: SealContainer,
    private readonly moveContainer: MoveContainer,
    private readonly getContainer: GetContainer,
    private readonly listContainers: ListContainers,
    @Inject(CONTAINER_AUTHORIZATION_LOOKUP)
    private readonly containerAuthLookup: ContainerAuthorizationLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
  ) {}

  /** Coordinator-or-admin gate for managing containers of an emergency. */
  private async assertEmergencyManager(
    emergencyId: string,
    req: AuthenticatedRequest,
  ): Promise<void> {
    if (req.user.isAdmin) return;
    const isCoordinator = await this.membershipRepo.hasRole(
      UserId.fromString(req.user.id),
      emergencyId,
      Role.Coordinator,
    );
    if (!isCoordinator) {
      throw new ForbiddenException(
        'Only a coordinator of the emergency can manage containers',
      );
    }
  }

  /** Resolves the container's emergency (404 if unknown) and gates management. */
  private async assertContainerManager(
    containerId: string,
    req: AuthenticatedRequest,
  ): Promise<void> {
    const facts =
      await this.containerAuthLookup.findAuthorizationFacts(containerId);
    if (facts === null) {
      throw new NotFoundException(`Container ${containerId} not found`);
    }
    await this.assertEmergencyManager(facts.emergencyId, req);
  }

  /** Read gate for a single container: admin, coordinator or verifier. */
  private async assertContainerReader(
    containerId: string,
    req: AuthenticatedRequest,
  ): Promise<void> {
    const facts =
      await this.containerAuthLookup.findAuthorizationFacts(containerId);
    if (facts === null) {
      throw new NotFoundException(`Container ${containerId} not found`);
    }
    if (req.user.isAdmin) return;
    const userId = UserId.fromString(req.user.id);
    const canRead =
      (await this.membershipRepo.hasRole(
        userId,
        facts.emergencyId,
        Role.Coordinator,
      )) ||
      (await this.membershipRepo.hasRole(
        userId,
        facts.emergencyId,
        Role.Verifier,
      ));
    if (!canRead) {
      throw new ForbiddenException(
        'Only a coordinator or verifier of the emergency can read this container',
      );
    }
  }

  @Post('supplies/containers')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a trackable container (palet/caja/lote) (coordinator)',
  })
  @ApiCreatedResponse({
    description: 'Container created (open), with a generated code',
    type: CreateContainerResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a coordinator of the emergency' })
  async create(
    @Body() dto: CreateContainerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CreateContainerResponseDto> {
    await this.assertEmergencyManager(dto.emergencyId, req);
    return this.createContainer.execute({
      emergencyId: dto.emergencyId,
      type: dto.type,
      lines: (dto.lines ?? []).map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unit: l.unit ?? null,
        category: l.category,
        presentation: l.presentation ?? null,
      })),
      grossWeightKg: dto.grossWeightKg ?? null,
      grossVolumeM3: dto.grossVolumeM3 ?? null,
      holder: dto.holder ? { type: dto.holder.type, id: dto.holder.id } : null,
    });
  }

  @Post('supplies/containers/:id/lines')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a supply line to a container (coordinator)' })
  @ApiParam({ name: 'id', description: 'Container UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Line added' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Container not found' })
  @ApiConflictResponse({ description: 'Container is sealed (lines immutable)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a coordinator of the emergency' })
  async addLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SupplyLineDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertContainerManager(id, req);
    await this.addLineToContainer.execute({
      containerId: id,
      line: {
        name: dto.name,
        quantity: dto.quantity,
        unit: dto.unit ?? null,
        category: dto.category,
        presentation: dto.presentation ?? null,
      },
    });
  }

  @Delete('supplies/containers/:id/lines/:index')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Remove the supply line at an index from a container (coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Container UUID', format: 'uuid' })
  @ApiParam({ name: 'index', description: 'Zero-based line index', example: 0 })
  @ApiNoContentResponse({ description: 'Line removed' })
  @ApiNotFoundResponse({ description: 'Container not found' })
  @ApiConflictResponse({ description: 'Container is sealed (lines immutable)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a coordinator of the emergency' })
  async removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('index', ParseIntPipe) index: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertContainerManager(id, req);
    await this.removeLineFromContainer.execute({ containerId: id, index });
  }

  @Post('supplies/containers/:id/nest')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Nest a container under a parent, or un-nest it (coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Container UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Container re-parented' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Container or parent not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Would create a cycle, or parent is a different emergency',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a coordinator of the emergency' })
  async nest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NestContainerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertContainerManager(id, req);
    await this.nestContainer.execute({
      containerId: id,
      parentContainerId: dto.parentContainerId ?? null,
    });
  }

  @Post('supplies/containers/:id/seal')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seal (precintar) a container (coordinator)' })
  @ApiParam({ name: 'id', description: 'Container UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Container sealed' })
  @ApiNotFoundResponse({ description: 'Container not found' })
  @ApiConflictResponse({ description: 'Container is already sealed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a coordinator of the emergency' })
  async seal(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertContainerManager(id, req);
    await this.sealContainer.execute({ containerId: id });
  }

  @Post('supplies/containers/:id/move')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Move a container to a holder (resource ↔ shipment) (coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Container UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Container moved' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Container not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a coordinator of the emergency' })
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveContainerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertContainerManager(id, req);
    await this.moveContainer.execute({
      containerId: id,
      holder: dto.holder ? { type: dto.holder.type, id: dto.holder.id } : null,
    });
  }

  @Get('supplies/containers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get a container tree with aggregated weight/volume (coordinator/verifier)',
  })
  @ApiParam({ name: 'id', description: 'Container UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Container tree', type: ContainerTreeViewDto })
  @ApiNotFoundResponse({ description: 'Container not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not a coordinator/verifier of the emergency',
  })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ContainerTreeView> {
    await this.assertContainerReader(id, req);
    return this.getContainer.execute({ containerId: id });
  }

  @Get('emergencies/:emergencyId/supplies/containers')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('container:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List containers for an emergency (coordinator/verifier)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'Containers', type: [ContainerViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing container:read permission' })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: ListContainersQueryDto,
  ): Promise<ContainerView[]> {
    return this.listContainers.execute({
      emergencyId,
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.holderType !== undefined
        ? { holderType: query.holderType }
        : {}),
      ...(query.holderId !== undefined ? { holderId: query.holderId } : {}),
      ...(query.topLevelOnly !== undefined
        ? { topLevelOnly: query.topLevelOnly }
        : {}),
    });
  }
}
