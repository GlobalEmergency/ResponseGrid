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
import { SubmitOffer } from '../../application/submit-offer';
import { MatchOffer } from '../../application/match-offer';
import { MarkOfferFulfilled } from '../../application/mark-offer-fulfilled';
import { CancelOffer } from '../../application/cancel-offer';
import { GetOffersQueue } from '../../application/get-offers-queue';
import { ListOffersForNeed } from '../../application/list-offers-for-need';
import { SuggestOffersForNeedWithLocation } from '../../application/suggest-offers-for-need';
import { GetMyOffers } from '../../application/get-my-offers';
import { SubmitOfferDto, MatchOfferDto } from './dto';
import { SubmitOfferResponseDto, OfferViewDto } from './response.dto';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  OFFER_NEED_LOOKUP,
  type NeedLookup,
} from '../../domain/ports/need-lookup';
import {
  OFFER_EMERGENCY_LOOKUP,
  type OfferEmergencyLookup,
} from '../../../identity/domain/ports/offer-emergency-lookup';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../identity/domain/ports/membership.repository';
import { UserId } from '../../../identity/domain/user-id';
import { Role } from '../../../identity/domain/role';
import { OfferView } from '../../application/offer-view';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string; email: string; isAdmin: boolean };
}

@ApiTags('offers')
@Controller()
export class OffersController {
  constructor(
    private readonly submitOffer: SubmitOffer,
    private readonly matchOffer: MatchOffer,
    private readonly markOfferFulfilled: MarkOfferFulfilled,
    private readonly cancelOffer: CancelOffer,
    private readonly getOffersQueue: GetOffersQueue,
    private readonly listOffersForNeed: ListOffersForNeed,
    private readonly suggestOffersForNeed: SuggestOffersForNeedWithLocation,
    private readonly getMyOffers: GetMyOffers,
    @Inject(OFFER_NEED_LOOKUP)
    private readonly needLookup: NeedLookup,
    @Inject(OFFER_EMERGENCY_LOOKUP)
    private readonly offerEmergencyLookup: OfferEmergencyLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
  ) {}

  @Post('emergencies/:emergencyId/offers')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit a donation offer for an emergency (authenticated donor)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Offer created',
    type: SubmitOfferResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiConflictResponse({
    description: 'Emergency is not accepting intake (paused/closed)',
  })
  async submit(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: SubmitOfferDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SubmitOfferResponseDto> {
    return this.submitOffer.execute({
      emergencyId,
      donorUserId: req.user.id,
      donorOrganizationId: dto.donorOrganizationId ?? null,
      category: dto.category,
      description: dto.description,
      quantity: dto.quantity,
      unit: dto.unit ?? null,
      location: {
        address: dto.location.address,
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
      },
      targetNeedId: dto.targetNeedId ?? null,
      notes: dto.notes ?? null,
    });
  }

  @Get('emergencies/:emergencyId/offers/queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('offer:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get open offers queue for an emergency (coordinator only)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'List of open offers', type: [OfferViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async listQueue(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<OfferView[]> {
    return this.getOffersQueue.execute({ emergencyId });
  }

  @Get('emergencies/:emergencyId/offers/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List my offers for an emergency (authenticated donor)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'My offers', type: [OfferViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async listMine(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<OfferView[]> {
    return this.getMyOffers.execute({ emergencyId, userId: req.user.id });
  }

  @Get('needs/:needId/offers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List matched offers for a need (coordinator only)',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Offers matched to the need',
    type: [OfferViewDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  @ApiNotFoundResponse({ description: 'Need not found' })
  async listForNeed(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<OfferView[]> {
    const loc = await this.needLookup.findLocation(needId);
    if (!loc) throw new NotFoundException(`Need ${needId} not found`);

    if (!req.user.isAdmin) {
      const hasRole = await this.membershipRepo.hasRole(
        UserId.fromString(req.user.id),
        loc.emergencyId,
        Role.Coordinator,
      );
      if (!hasRole)
        throw new ForbiddenException(
          'Coordinator role required for this emergency',
        );
    }
    return this.listOffersForNeed.execute({ needId });
  }

  @Get('needs/:needId/offer-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Suggest open offers for a need (coordinator only), sorted by proximity',
  })
  @ApiParam({ name: 'needId', description: 'Need UUID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Suggested offers sorted by proximity',
    type: [OfferViewDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  @ApiNotFoundResponse({ description: 'Need not found' })
  async suggestForNeed(
    @Param('needId', ParseUUIDPipe) needId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<OfferView[]> {
    const loc = await this.needLookup.findLocation(needId);
    if (!loc) throw new NotFoundException(`Need ${needId} not found`);

    if (!req.user.isAdmin) {
      const hasRole = await this.membershipRepo.hasRole(
        UserId.fromString(req.user.id),
        loc.emergencyId,
        Role.Coordinator,
      );
      if (!hasRole)
        throw new ForbiddenException(
          'Coordinator role required for this emergency',
        );
    }
    return this.suggestOffersForNeed.execute({
      needId,
      emergencyId: loc.emergencyId,
      needLatitude: loc.latitude,
      needLongitude: loc.longitude,
    });
  }

  @Post('offers/:offerId/match')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('offer:match')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Match an offer to a need (coordinator of the offer's emergency only)",
  })
  @ApiParam({ name: 'offerId', description: 'Offer UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Offer matched to need' })
  @ApiNotFoundResponse({ description: 'Offer or need not found' })
  @ApiConflictResponse({ description: 'Offer is not in Open status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async match(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() dto: MatchOfferDto,
  ): Promise<void> {
    const needEmergencyId = await this.needLookup.findEmergencyId(dto.needId);
    if (!needEmergencyId) {
      throw new NotFoundException(`Need ${dto.needId} not found`);
    }
    await this.matchOffer.execute({
      offerId,
      needId: dto.needId,
      needEmergencyId,
    });
  }

  @Post('offers/:offerId/fulfill')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('offer:match')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Mark an offer as fulfilled (coordinator of the offer's emergency only)",
  })
  @ApiParam({ name: 'offerId', description: 'Offer UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Offer fulfilled' })
  @ApiNotFoundResponse({ description: 'Offer not found' })
  @ApiConflictResponse({ description: 'Offer is not in Matched status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async fulfill(
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ): Promise<void> {
    await this.markOfferFulfilled.execute({ offerId });
  }

  @Post('offers/:offerId/cancel')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an offer (owner or coordinator)' })
  @ApiParam({ name: 'offerId', description: 'Offer UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Offer cancelled' })
  @ApiNotFoundResponse({ description: 'Offer not found' })
  @ApiConflictResponse({
    description: 'Offer cannot be cancelled in its current status',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Only the offer owner or a coordinator can cancel',
  })
  async cancel(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    let isCoordinator = req.user.isAdmin;

    if (!isCoordinator) {
      const emergencyId =
        await this.offerEmergencyLookup.findEmergencyId(offerId);
      if (emergencyId !== null) {
        isCoordinator = await this.membershipRepo.hasRole(
          UserId.fromString(req.user.id),
          emergencyId,
          Role.Coordinator,
        );
      }
    }

    await this.cancelOffer.execute({
      offerId,
      requesterUserId: req.user.id,
      isCoordinator,
    });
  }
}
