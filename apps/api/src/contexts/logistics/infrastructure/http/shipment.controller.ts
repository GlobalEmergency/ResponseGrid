import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
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
import { ShipmentView } from '../../application/shipment-view';
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

interface AuthenticatedRequest extends Express.Request {
  user: { id: string; email: string; isAdmin: boolean };
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
    @Inject(SHIPMENT_AUTHORIZATION_LOOKUP)
    private readonly shipmentAuthLookup: ShipmentAuthorizationLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
  ) {}

  /**
   * Resolves whether the requester may mark transit/delivery on a shipment:
   * admin, a coordinator of the shipment's emergency, or its assigned carrier.
   * Returns the carrier-id so the use case can do the owner check, mirroring
   * how the capacity withdraw resolves coordinator-ship.
   */
  private async resolveActor(
    shipmentId: string,
    req: AuthenticatedRequest,
  ): Promise<{ isCoordinator: boolean }> {
    let isCoordinator = req.user.isAdmin;
    if (!isCoordinator) {
      const facts =
        await this.shipmentAuthLookup.findAuthorizationFacts(shipmentId);
      if (facts !== null) {
        isCoordinator = await this.membershipRepo.hasRole(
          UserId.fromString(req.user.id),
          facts.emergencyId,
          Role.Coordinator,
        );
      }
    }
    return { isCoordinator };
  }

  @Post('logistics/shipments')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('shipment:create')
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
  @ApiForbiddenResponse({ description: 'Missing shipment:create permission' })
  @ApiConflictResponse({
    description: 'Emergency is not accepting intake (paused/closed)',
  })
  async create(
    @Body() dto: CreateShipmentDto,
  ): Promise<CreateShipmentResponseDto> {
    return this.createShipment.execute({
      emergencyId: dto.emergencyId,
      originResourceId: dto.originResourceId,
      destinationResourceId: dto.destinationResourceId,
      items: dto.items.map((i) => ({
        description: i.description,
        quantity: i.quantity ?? null,
        unit: i.unit ?? null,
        category: i.category ?? null,
      })),
      manifest: dto.manifest ?? null,
    });
  }

  @Post('logistics/shipments/:id/assign-capacity')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('shipment:assign')
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
  @ApiForbiddenResponse({ description: 'Missing shipment:assign permission' })
  async assignCapacity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCapacityToShipmentDto,
  ): Promise<void> {
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('shipment:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a shipment (coordinator)' })
  @ApiParam({ name: 'id', description: 'Shipment UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Shipment cancelled' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({
    description: 'Shipment cannot be cancelled in its current status',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing shipment:update permission' })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
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
}
