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
import { PublishCapacity } from '../../application/publish-capacity';
import { WithdrawCapacity } from '../../application/withdraw-capacity';
import { ListCapacities } from '../../application/list-capacities';
import { CapacityView } from '../../application/capacity-view';
import {
  PublishCapacityDto,
  CoverageDto,
  ListCapacitiesQueryDto,
} from './dto';
import { PublishCapacityResponseDto, CapacityViewDto } from './response.dto';
import { CoverageProps } from '../../domain/coverage';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  CAPACITY_EMERGENCY_LOOKUP,
  type CapacityEmergencyLookup,
} from '../../domain/ports/capacity-emergency-lookup';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../identity/domain/ports/membership.repository';
import { UserId } from '../../../identity/domain/user-id';
import { Role } from '../../../identity/domain/role';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string; email: string; isAdmin: boolean };
}

/** Maps the flat coverage DTO (optionals → undefined) to domain props (null). */
function toCoverageProps(dto: CoverageDto): CoverageProps {
  if (dto.kind === 'area') {
    return { kind: 'area', area: dto.area ?? '' };
  }
  return {
    kind: 'corridor',
    originResourceId: dto.originResourceId ?? null,
    destinationResourceId: dto.destinationResourceId ?? null,
    originLat: dto.originLat ?? null,
    originLng: dto.originLng ?? null,
    destinationLat: dto.destinationLat ?? null,
    destinationLng: dto.destinationLng ?? null,
  };
}

@ApiTags('logistics')
@Controller()
export class LogisticsController {
  constructor(
    private readonly publishCapacity: PublishCapacity,
    private readonly withdrawCapacity: WithdrawCapacity,
    private readonly listCapacities: ListCapacities,
    @Inject(CAPACITY_EMERGENCY_LOOKUP)
    private readonly capacityEmergencyLookup: CapacityEmergencyLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
  ) {}

  @Post('logistics/capacities')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('capacity:publish')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish a transport-capacity offer (authenticated, citizen-grade)',
  })
  @ApiCreatedResponse({
    description: 'Capacity published',
    type: PublishCapacityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing capacity:publish permission' })
  @ApiConflictResponse({
    description: 'Emergency is not accepting intake (paused/closed)',
  })
  async publish(
    @Body() dto: PublishCapacityDto,
  ): Promise<PublishCapacityResponseDto> {
    return this.publishCapacity.execute({
      emergencyId: dto.emergencyId,
      provider: { type: dto.provider.type, id: dto.provider.id },
      mode: dto.mode,
      capacity: {
        weightKg: dto.capacity.weightKg ?? null,
        volumeM3: dto.capacity.volumeM3 ?? null,
      },
      coverage: toCoverageProps(dto.coverage),
      window: {
        from: dto.window?.from ?? null,
        to: dto.window?.to ?? null,
      },
      constraints: dto.constraints ?? [],
      notes: dto.notes ?? null,
    });
  }

  @Post('logistics/capacities/:id/withdraw')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Withdraw a transport-capacity offer (provider or coordinator)',
  })
  @ApiParam({ name: 'id', description: 'Capacity UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Capacity withdrawn' })
  @ApiNotFoundResponse({ description: 'Capacity not found' })
  @ApiConflictResponse({
    description: 'Capacity cannot be withdrawn in its current status',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Only the provider or a coordinator can withdraw',
  })
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    let isCoordinator = req.user.isAdmin;

    if (!isCoordinator) {
      const emergencyId =
        await this.capacityEmergencyLookup.findEmergencyId(id);
      if (emergencyId !== null) {
        isCoordinator = await this.membershipRepo.hasRole(
          UserId.fromString(req.user.id),
          emergencyId,
          Role.Coordinator,
        );
      }
    }

    await this.withdrawCapacity.execute({
      capacityId: id,
      requesterUserId: req.user.id,
      isCoordinator,
    });
  }

  @Get('emergencies/:emergencyId/logistics/capacities')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('capacity:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List transport capacities for an emergency (coordinator/verifier)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'Capacities', type: [CapacityViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing capacity:read permission' })
  async list(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: ListCapacitiesQueryDto,
  ): Promise<CapacityView[]> {
    return this.listCapacities.execute({
      emergencyId,
      ...(query.mode !== undefined ? { mode: query.mode } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.availableFrom !== undefined
        ? { availableFrom: query.availableFrom }
        : {}),
      ...(query.availableTo !== undefined
        ? { availableTo: query.availableTo }
        : {}),
    });
  }
}
