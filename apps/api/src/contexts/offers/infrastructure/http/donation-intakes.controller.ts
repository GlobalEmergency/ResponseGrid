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
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CreateDonationIntake } from '../../application/create-donation-intake';
import { LookupDonorByContact } from '../../application/lookup-donor-by-contact';
import { UpdateDonationIntake } from '../../application/update-donation-intake';
import { SearchDonationIntakes } from '../../application/search-donation-intakes';
import { GetDonationIntakeById } from '../../application/get-donation-intake-by-id';
import { ListPendingIntakesByResource } from '../../application/list-pending-intakes-by-resource';
import { ConfirmIntakeReception } from '../../application/confirm-intake-reception';
import { RejectIntake } from '../../application/reject-intake';
import { MarkIntakeIncomplete } from '../../application/mark-intake-incomplete';
import { GetIntakeDeepLink } from '../../application/get-intake-deep-link';
import {
  CreateDonationIntakeDto,
  LookupDonorByContactDto,
  UpdateDonationIntakeDto,
  ReceiveDonationIntakeDto,
  RejectDonationIntakeDto,
  MarkDonationIntakeIncompleteDto,
  SearchDonationIntakesQueryDto,
} from './donation-intake.dto';
import {
  CreateDonationIntakeResponseDto,
  LookupDonorByContactResponseDto,
  DonationIntakeViewDto,
  DonationIntakeSearchHitDto,
  IntakeDeepLinkDto,
} from './donation-intake-response.dto';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../identity/infrastructure/http/optional-jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';

type OptionalAuthedRequest = Express.Request & { user?: AuthenticatedUser };
type AuthedRequest = Express.Request & { user: AuthenticatedUser };

import { SupplyLineProps } from '../../../supplies/domain/supply-line';

function mapItems(items: CreateDonationIntakeDto['items']): SupplyLineProps[] {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit ?? null,
    category: item.category,
    presentation: item.presentation ?? null,
  }));
}

@ApiTags('donation-intakes')
@Controller()
export class DonationIntakesController {
  constructor(
    private readonly createDonationIntake: CreateDonationIntake,
    private readonly lookupDonorByContact: LookupDonorByContact,
    private readonly updateDonationIntake: UpdateDonationIntake,
    private readonly searchDonationIntakes: SearchDonationIntakes,
    private readonly getDonationIntakeById: GetDonationIntakeById,
    private readonly listPendingIntakesByResource: ListPendingIntakesByResource,
    private readonly confirmIntakeReception: ConfirmIntakeReception,
    private readonly rejectIntake: RejectIntake,
    private readonly markIntakeIncomplete: MarkIntakeIncomplete,
    private readonly getIntakeDeepLink: GetIntakeDeepLink,
  ) {}

  @Post('emergencies/:emergencyId/donation-intakes')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard, OptionalJwtAuthGuard)
  @Throttle({ intake: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Pre-register a donation at a collection point (public)',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Intake created',
    type: CreateDonationIntakeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({
    description: 'Emergency is not accepting intake (paused/closed)',
  })
  @ApiUnprocessableEntityResponse({ description: 'Invalid collection point' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: CreateDonationIntakeDto,
    @Request() req: OptionalAuthedRequest,
  ): Promise<CreateDonationIntakeResponseDto> {
    return this.createDonationIntake.execute({
      emergencyId,
      targetResourceId: dto.targetResourceId,
      donorName: dto.donorName,
      donorPhone: dto.donorPhone ?? null,
      donorEmail: dto.donorEmail ?? null,
      donorUserId: req.user?.id ?? null,
      items: mapItems(dto.items),
    });
  }

  @Post('emergencies/:emergencyId/donation-intakes/lookup-contact')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ intake: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Recognize a returning donor by phone or email (public)',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiOkResponse({ type: LookupDonorByContactResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async lookupContact(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: LookupDonorByContactDto,
  ): Promise<LookupDonorByContactResponseDto> {
    return this.lookupDonorByContact.execute({
      emergencyId,
      donorPhone: dto.donorPhone ?? null,
      donorEmail: dto.donorEmail ?? null,
    });
  }

  @Patch('donation-intakes/:intakeId')
  @UseGuards(ThrottlerGuard)
  @Throttle({ intake: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Update a pending intake (public, requires code + contact)',
  })
  @ApiParam({ name: 'intakeId', format: 'uuid' })
  @ApiOkResponse({ type: DonationIntakeViewDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiForbiddenResponse({ description: 'Contact or code mismatch' })
  @ApiNotFoundResponse({ description: 'Intake not found' })
  @ApiConflictResponse({ description: 'Intake already processed' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async update(
    @Param('intakeId', ParseUUIDPipe) intakeId: string,
    @Body() dto: UpdateDonationIntakeDto,
  ): Promise<DonationIntakeViewDto> {
    await this.updateDonationIntake.execute({
      intakeId,
      intakeCode: dto.intakeCode,
      donorName: dto.donorName,
      donorPhone: dto.donorPhone ?? null,
      donorEmail: dto.donorEmail ?? null,
      items: mapItems(dto.items),
    });
    return this.getDonationIntakeById.execute(intakeId);
  }

  @Get('emergencies/:emergencyId/donation-intakes/search')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search intakes by phone, email, code or name' })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiOkResponse({ type: [DonationIntakeSearchHitDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:read' })
  async search(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: SearchDonationIntakesQueryDto,
  ): Promise<DonationIntakeSearchHitDto[]> {
    return this.searchDonationIntakes.execute({
      emergencyId,
      query: query.q,
    });
  }

  @Get('donation-intakes/:intakeId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full intake detail with lines' })
  @ApiParam({ name: 'intakeId', format: 'uuid' })
  @ApiOkResponse({ type: DonationIntakeViewDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:read' })
  @ApiNotFoundResponse({ description: 'Intake not found' })
  async getById(
    @Param('intakeId', ParseUUIDPipe) intakeId: string,
  ): Promise<DonationIntakeViewDto> {
    return this.getDonationIntakeById.execute(intakeId);
  }

  @Get('resources/:resourceId/intake-link')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the public deep link for pre-registering at this acopio',
  })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({ type: IntakeDeepLinkDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:read' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Resource is not a published collection point',
  })
  async getIntakeLink(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<IntakeDeepLinkDto> {
    return this.getIntakeDeepLink.execute(resourceId);
  }

  @Get('resources/:resourceId/intake-qr')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate a QR code PNG for the intake deep link of this acopio',
  })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({
    description: 'PNG image',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:read' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Resource is not a published collection point',
  })
  async getIntakeQr(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<StreamableFile> {
    const png = await this.getIntakeDeepLink.generateQr(resourceId);
    return new StreamableFile(png, {
      type: 'image/png',
      disposition: `inline; filename="intake-${resourceId}.png"`,
    });
  }

  @Get('resources/:resourceId/donation-intakes/pending')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending intakes for a collection point' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({ type: [DonationIntakeSearchHitDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:read' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  async listPending(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<DonationIntakeSearchHitDto[]> {
    return this.listPendingIntakesByResource.execute(resourceId);
  }

  @Post('donation-intakes/:intakeId/receive')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:receive')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm physical reception of a pending intake' })
  @ApiParam({ name: 'intakeId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Intake marked as received' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:receive' })
  @ApiNotFoundResponse({ description: 'Intake not found' })
  @ApiConflictResponse({ description: 'Intake already processed' })
  async receive(
    @Param('intakeId', ParseUUIDPipe) intakeId: string,
    @Body() dto: ReceiveDonationIntakeDto,
    @Request() req: AuthedRequest,
  ): Promise<void> {
    await this.confirmIntakeReception.execute({
      intakeId,
      receivedByUserId: req.user.id,
      volunteerNotes: dto.volunteerNotes ?? null,
      evidenceFileKey: dto.evidenceFileKey ?? null,
    });
  }

  @Post('donation-intakes/:intakeId/reject')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:receive')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending intake at reception' })
  @ApiParam({ name: 'intakeId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Intake marked as rejected' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:receive' })
  @ApiNotFoundResponse({ description: 'Intake not found' })
  @ApiConflictResponse({ description: 'Intake already processed' })
  async reject(
    @Param('intakeId', ParseUUIDPipe) intakeId: string,
    @Body() dto: RejectDonationIntakeDto,
  ): Promise<void> {
    await this.rejectIntake.execute({
      intakeId,
      volunteerNotes: dto.volunteerNotes ?? null,
    });
  }

  @Post('donation-intakes/:intakeId/incomplete')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('intake:receive')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark a pending intake as incomplete (material mismatch)',
  })
  @ApiParam({ name: 'intakeId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Intake marked as incomplete' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing intake:receive' })
  @ApiNotFoundResponse({ description: 'Intake not found' })
  @ApiConflictResponse({ description: 'Intake already processed' })
  async markIncomplete(
    @Param('intakeId', ParseUUIDPipe) intakeId: string,
    @Body() dto: MarkDonationIntakeIncompleteDto,
  ): Promise<void> {
    await this.markIntakeIncomplete.execute({
      intakeId,
      volunteerNotes: dto.volunteerNotes ?? null,
    });
  }
}
