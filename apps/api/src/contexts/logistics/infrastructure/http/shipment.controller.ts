import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
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
} from '@nestjs/swagger';
import { CreateShipment } from '../../application/create-shipment';
import { AssignCapacityToShipment } from '../../application/assign-capacity-to-shipment';
import { MarkShipmentInTransit } from '../../application/mark-shipment-in-transit';
import { ConfirmShipmentDelivery } from '../../application/confirm-shipment-delivery';
import { CancelShipment } from '../../application/cancel-shipment';
import { ListShipments } from '../../application/list-shipments';
import { GetMyShipments } from '../../application/get-my-shipments';
import { SuggestCapacitiesForShipment } from '../../application/suggest-capacities-for-shipment';
import { ShipmentView } from '../../application/shipment-view';
import { CapacityView } from '../../application/capacity-view';
import {
  CreateShipmentDto,
  AssignCapacityToShipmentDto,
  ListShipmentsQueryDto,
  MyShipmentsQueryDto,
} from './shipment-dto';
import {
  CreateShipmentResponseDto,
  ShipmentViewDto,
} from './shipment-response.dto';
import { CapacityViewDto } from './response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  SHIPMENT_AUTHORIZATION_LOOKUP,
  type ShipmentAuthorizationLookup,
} from '../../domain/ports/shipment-authorization-lookup';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../identity/domain/ports/membership.repository';
import { UserId } from '../../../identity/domain/user-id';
import { Role } from '../../../identity/domain/role';
import {
  ACCESS_CONTROL,
  type AccessControl,
} from '../../../identity/domain/authorization/access-control';
import type { Permission } from '../../../identity/domain/authorization/permission';
import type { GrantSnapshot } from '../../../identity/domain/authorization/grant';
import type { ScopeRefProps } from '../../../identity/domain/authorization/scope-ref';

interface AuthenticatedRequest extends Express.Request {
  user: {
    id: string;
    email: string;
    isAdmin: boolean;
    /** Effective request grants (populated by JwtAuthGuard) — used for the
     * hub-authority PDP check (#150). */
    grants: GrantSnapshot[];
  };
}

@ApiTags('logistics')
@Controller()
export class ShipmentController {
  constructor(
    private readonly createShipment: CreateShipment,
    private readonly assignCapacityToShipment: AssignCapacityToShipment,
    private readonly markShipmentInTransit: MarkShipmentInTransit,
    private readonly confirmShipmentDelivery: ConfirmShipmentDelivery,
    private readonly cancelShipment: CancelShipment,
    private readonly listShipments: ListShipments,
    private readonly getMyShipments: GetMyShipments,
    private readonly suggestCapacitiesForShipment: SuggestCapacitiesForShipment,
    @Inject(SHIPMENT_AUTHORIZATION_LOOKUP)
    private readonly shipmentAuthLookup: ShipmentAuthorizationLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
    @Inject(ACCESS_CONTROL)
    private readonly accessControl: AccessControl,
  ) {}

  /**
   * Cross-emergency hub authority (#150 Hueco 2, §16.3 / #108): a principal
   * whose grant confers `permission` at a scope covering the shipment's
   * logistics hub may operate it WITHOUT being a coordinator of its emergency.
   * The hub id is an opaque scope reference — the PDP matches the grant's `hub`
   * scope against the shipment's `hubId` over the hub → platform chain, so a
   * `hub_manager` is allowed exactly for the permissions its role confers
   * (create/read/track) and denied the rest (assign/update). Returns false when
   * the shipment has no hub (nothing to manage).
   */
  private hasHubAuthority(
    hubId: string | null,
    permission: Permission,
    req: AuthenticatedRequest,
  ): Promise<boolean> {
    if (hubId === null) return Promise.resolve(false);
    const scopeChain: ScopeRefProps[] = [
      { type: 'hub', id: hubId },
      { type: 'platform' },
    ];
    return this.accessControl.can(
      { principalId: req.user.id, grants: req.user.grants },
      permission,
      { scopeChain },
    );
  }

  /**
   * Resolves whether the requester may mark transit/delivery on a shipment
   * without being its assigned carrier: admin, a coordinator of the shipment's
   * emergency, or a manager of its hub (#150). Returned as `isCoordinator` so
   * the use case keeps its carrier-or-authority check unchanged.
   */
  private async resolveActor(
    shipmentId: string,
    req: AuthenticatedRequest,
  ): Promise<{ isCoordinator: boolean }> {
    if (req.user.isAdmin) return { isCoordinator: true };
    const facts =
      await this.shipmentAuthLookup.findAuthorizationFacts(shipmentId);
    if (facts === null) return { isCoordinator: false };
    let authorized = await this.membershipRepo.hasRole(
      UserId.fromString(req.user.id),
      facts.emergencyId,
      Role.Coordinator,
    );
    if (!authorized) {
      authorized = await this.hasHubAuthority(
        facts.hubId,
        'shipment:track',
        req,
      );
    }
    return { isCoordinator: authorized };
  }

  /**
   * Authority gate for shipment writes whose route carries no scope-resolvable
   * param (the global PermissionGuard would otherwise fall back to the platform
   * scope and 403 a legitimate coordinator — #150 Hueco 1). Admin, a coordinator
   * of the shipment's emergency, or — for a `permission` the principal's role
   * confers — a manager of the shipment's hub (Hueco 2). 404s an unknown
   * shipment before the 403, like the use cases do.
   */
  private async assertMayActOnShipment(
    shipmentId: string,
    permission: Permission,
    req: AuthenticatedRequest,
  ): Promise<void> {
    if (req.user.isAdmin) return;
    const facts =
      await this.shipmentAuthLookup.findAuthorizationFacts(shipmentId);
    if (facts === null) {
      throw new NotFoundException(`shipment ${shipmentId} not found`);
    }
    const isCoordinator = await this.membershipRepo.hasRole(
      UserId.fromString(req.user.id),
      facts.emergencyId,
      Role.Coordinator,
    );
    if (isCoordinator) return;
    if (await this.hasHubAuthority(facts.hubId, permission, req)) return;
    throw new ForbiddenException(
      'Only a coordinator of the shipment emergency or a manager of its hub can perform this action',
    );
  }

  /**
   * Authority gate for creating a shipment: admin, a coordinator of the target
   * emergency, or a manager of the hub the expedition will transit (#150). The
   * hub comes from the body — there is no shipment row yet.
   */
  private async assertMayCreate(
    emergencyId: string,
    hubId: string | null,
    req: AuthenticatedRequest,
  ): Promise<void> {
    if (req.user.isAdmin) return;
    const isCoordinator = await this.membershipRepo.hasRole(
      UserId.fromString(req.user.id),
      emergencyId,
      Role.Coordinator,
    );
    if (isCoordinator) return;
    if (await this.hasHubAuthority(hubId, 'shipment:create', req)) return;
    throw new ForbiddenException(
      'Only a coordinator of the emergency or a manager of the shipment hub can create a shipment',
    );
  }

  @Post('logistics/shipments')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a shipment / expedición (coordinator)',
  })
  @ApiCreatedResponse({
    description: 'Shipment created (planned)',
    type: CreateShipmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not a coordinator of the emergency',
  })
  @ApiConflictResponse({
    description: 'Emergency is not accepting intake (paused/closed)',
  })
  async create(
    @Body() dto: CreateShipmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CreateShipmentResponseDto> {
    await this.assertMayCreate(dto.emergencyId, dto.hubId ?? null, req);
    return this.createShipment.execute({
      emergencyId: dto.emergencyId,
      originResourceId: dto.originResourceId,
      destinationResourceId: dto.destinationResourceId,
      items: (dto.items ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit ?? null,
        category: i.category,
        presentation: i.presentation ?? null,
      })),
      containerIds: dto.containerIds ?? [],
      hubId: dto.hubId ?? null,
      manifest: dto.manifest ?? null,
    });
  }

  @Post('logistics/shipments/:id/assign-capacity')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a transport capacity (and optional carrier) (coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Capacity assigned' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({ description: 'Shipment is not in planned status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not a coordinator of the shipment emergency',
  })
  async assignCapacity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCapacityToShipmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertMayActOnShipment(id, 'shipment:assign', req);
    await this.assignCapacityToShipment.execute({
      shipmentId: id,
      assignedCapacityId: dto.assignedCapacityId,
      carrier: dto.carrier
        ? { type: dto.carrier.type, id: dto.carrier.id }
        : null,
    });
  }

  @Post('logistics/shipments/:id/in-transit')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark a shipment in transit (assigned carrier or coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Shipment marked in transit' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({ description: 'Shipment is not in assigned status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Only the assigned carrier or a coordinator can act',
  })
  async markInTransit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const { isCoordinator } = await this.resolveActor(id, req);
    await this.markShipmentInTransit.execute({
      shipmentId: id,
      requesterUserId: req.user.id,
      isCoordinator,
    });
  }

  @Post('logistics/shipments/:id/deliver')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm a shipment delivery (assigned carrier or coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Shipment delivered' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({ description: 'Shipment is not in transit' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Only the assigned carrier or a coordinator can act',
  })
  async deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const { isCoordinator } = await this.resolveActor(id, req);
    await this.confirmShipmentDelivery.execute({
      shipmentId: id,
      requesterUserId: req.user.id,
      isCoordinator,
    });
  }

  @Post('logistics/shipments/:id/cancel')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a shipment (coordinator)' })
  @ApiParam({ name: 'id', description: 'Shipment UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Shipment cancelled' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({
    description: 'Shipment cannot be cancelled in its current status',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not a coordinator of the shipment emergency',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.assertMayActOnShipment(id, 'shipment:update', req);
    await this.cancelShipment.execute({ shipmentId: id });
  }

  @Get('logistics/shipments/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List my shipments as a carrier ("mis expediciones")',
  })
  @ApiOkResponse({ description: 'My shipments', type: [ShipmentViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async listMine(
    @Query() query: MyShipmentsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ShipmentView[]> {
    return this.getMyShipments.execute({
      carrierId: req.user.id,
      emergencyId: query.emergencyId ?? null,
    });
  }

  @Get('emergencies/:emergencyId/logistics/shipments')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('shipment:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List shipments for an emergency (coordinator/verifier)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'Shipments', type: [ShipmentViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing shipment:read permission' })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: ListShipmentsQueryDto,
  ): Promise<ShipmentView[]> {
    return this.listShipments.execute({
      emergencyId,
      ...(query.status !== undefined ? { status: query.status } : {}),
    });
  }

  @Get('logistics/shipments/:id/capacity-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Suggest compatible transport capacities for a shipment, ranked (coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Shipment UUID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Compatible capacities ranked by proximity/coverage fit',
    type: [CapacityViewDto],
  })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Not a coordinator of the shipment emergency',
  })
  async capacitySuggestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CapacityView[]> {
    await this.assertMayActOnShipment(id, 'shipment:read', req);
    return this.suggestCapacitiesForShipment.execute({ shipmentId: id });
  }
}
