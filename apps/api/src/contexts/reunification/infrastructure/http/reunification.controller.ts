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
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../identity/infrastructure/http/optional-jwt-auth.guard';
import { RequireCoordinatorGuard } from '../../../identity/infrastructure/http/require-coordinator.guard';
import { RequireReunificationReportCoordinatorGuard } from '../../../identity/infrastructure/http/require-reunification-report-coordinator.guard';
import { CreateMissingPersonReport } from '../../application/create-missing-person-report';
import { ListMissingPersonReports } from '../../application/list-missing-person-reports';
import { GetMissingPersonReport } from '../../application/get-missing-person-report';
import { UpdateReportStatus } from '../../application/update-report-status';
import { RegisterSighting } from '../../application/register-sighting';
import { SearchByDocumentId } from '../../application/search-by-document-id';
import { GetMyReports } from '../../application/get-my-reports';
import { ReunificationDomainExceptionFilter } from './domain-exception.filter';
import {
  CreateMissingPersonReportDto,
  UpdateReportStatusDto,
  RegisterSightingDto,
  ReportListFiltersDto,
} from './dto';
import {
  CreateMissingPersonReportResponseDto,
  MissingPersonReportListItemDto,
  MissingPersonReportDetailDto,
  MyReportResponseDto,
  RegisterSightingResponseDto,
  PersonDetailResponseDto,
  SightingResponseDto,
} from './response.dto';
import { MissingPersonReportSnapshot } from '../../domain/missing-person-report';
import { LocationProps } from '../../../../shared/domain/location';

function mapCoordsResponse(
  coords: LocationProps | null,
): { address: string; latitude: number; longitude: number } | null {
  if (!coords) return null;
  return {
    address: coords.address,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

function mapPersonDetail(
  snapshot: MissingPersonReportSnapshot,
): PersonDetailResponseDto {
  const dto = new PersonDetailResponseDto();
  dto.firstName = snapshot.person.firstName;
  dto.lastName = snapshot.person.lastName;
  dto.documentId = snapshot.person.documentId;
  dto.approximateAge = snapshot.person.approximateAge;
  dto.lastKnownLocation = snapshot.person.lastKnownLocation;
  dto.lastKnownCoords = mapCoordsResponse(snapshot.person.lastKnownCoords);
  dto.description = snapshot.person.description;
  return dto;
}

function mapSightings(
  snapshot: MissingPersonReportSnapshot,
): SightingResponseDto[] {
  return snapshot.sightings.map((s) => {
    const dto = new SightingResponseDto();
    dto.id = s.id;
    dto.reportedByUserId = s.reportedByUserId;
    dto.reportedByName = s.reportedByName;
    dto.location = s.location;
    dto.coords = mapCoordsResponse(s.coords);
    dto.note = s.note;
    dto.reportedAt = s.reportedAt;
    return dto;
  });
}

function mapToListItem(
  snapshot: MissingPersonReportSnapshot,
): MissingPersonReportListItemDto {
  const dto = new MissingPersonReportListItemDto();
  dto.id = snapshot.id;
  dto.status = snapshot.status;
  dto.person = mapPersonDetail(snapshot);
  dto.createdAt = snapshot.createdAt;
  dto.updatedAt = snapshot.updatedAt;
  return dto;
}

function mapToDetail(
  snapshot: MissingPersonReportSnapshot,
): MissingPersonReportDetailDto {
  const dto = new MissingPersonReportDetailDto();
  dto.id = snapshot.id;
  dto.emergencyId = snapshot.emergencyId;
  dto.status = snapshot.status;
  dto.person = mapPersonDetail(snapshot);
  dto.reporterName = snapshot.reporter.name;
  dto.reporterPhone = snapshot.reporter.phone;
  dto.reporterEmail = snapshot.reporter.email;
  dto.sightings = mapSightings(snapshot);
  dto.matchNote = snapshot.matchNote;
  dto.reviewedByUserId = snapshot.reviewedByUserId;
  dto.createdAt = snapshot.createdAt;
  dto.updatedAt = snapshot.updatedAt;
  return dto;
}

function mapToMyReport(
  snapshot: MissingPersonReportSnapshot,
): MyReportResponseDto {
  const dto = new MyReportResponseDto();
  dto.id = snapshot.id;
  dto.emergencyId = snapshot.emergencyId;
  dto.status = snapshot.status;
  // Exclude sensitive fields (documentId, phone) in "mine" view
  const person = new PersonDetailResponseDto();
  person.firstName = snapshot.person.firstName;
  person.lastName = snapshot.person.lastName;
  person.documentId = null; // omit for privacy in my-reports response
  person.approximateAge = snapshot.person.approximateAge;
  person.lastKnownLocation = snapshot.person.lastKnownLocation;
  person.lastKnownCoords = mapCoordsResponse(snapshot.person.lastKnownCoords);
  person.description = snapshot.person.description;
  dto.person = person;
  dto.sightings = mapSightings(snapshot);
  dto.createdAt = snapshot.createdAt;
  dto.updatedAt = snapshot.updatedAt;
  return dto;
}

@ApiTags('reunification')
@Controller()
@UseFilters(ReunificationDomainExceptionFilter)
export class ReunificationController {
  constructor(
    private readonly createUc: CreateMissingPersonReport,
    private readonly listUc: ListMissingPersonReports,
    private readonly getUc: GetMissingPersonReport,
    private readonly updateStatusUc: UpdateReportStatus,
    private readonly registerSightingUc: RegisterSighting,
    private readonly searchByDocumentIdUc: SearchByDocumentId,
    private readonly getMyReportsUc: GetMyReports,
  ) {}

  // ── Public endpoint (rate-limited) ──────────────────────────────────────────

  @Post('emergencies/:emergencyId/reunification')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard, OptionalJwtAuthGuard)
  @Throttle({ auth: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary:
      'Create a missing person report for an emergency (public, anonymous-with-contact)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Report created',
    type: CreateMissingPersonReportResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID' })
  @ApiUnprocessableEntityResponse({ description: 'No consent or invalid data' })
  @ApiConflictResponse({ description: 'Emergency not active (paused/closed)' })
  async createReport(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: CreateMissingPersonReportDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<CreateMissingPersonReportResponseDto> {
    const result = await this.createUc.execute({
      emergencyId,
      person: {
        firstName: dto.person.firstName,
        lastName: dto.person.lastName,
        documentId: dto.person.documentId ?? null,
        approximateAge: dto.person.approximateAge ?? null,
        lastKnownLocation: dto.person.lastKnownLocation,
        lastKnownCoords: dto.person.lastKnownCoords ?? null,
        description: dto.person.description ?? null,
      },
      reporter: {
        // Link to user if JWT was provided
        userId: req.user?.id ?? null,
        name: dto.reporter.name,
        phone: dto.reporter.phone,
        email: dto.reporter.email ?? null,
      },
      consentGiven: dto.consentGiven,
    });
    const response = new CreateMissingPersonReportResponseDto();
    response.id = result.id;
    response.status = result.status;
    return response;
  }

  // ── Coordinator endpoints (scoped by emergencyId) ────────────────────────

  @Get('emergencies/:emergencyId/reunification')
  @UseGuards(JwtAuthGuard, RequireCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List missing person reports for an emergency (coordinator only)',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'under_review', 'matched', 'closed'],
  })
  @ApiOkResponse({ type: MissingPersonReportListItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async listReports(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() filters: ReportListFiltersDto,
  ): Promise<MissingPersonReportListItemDto[]> {
    const listQuery: {
      emergencyId: string;
      status?: import('../../domain/missing-person-status').MissingPersonStatus;
    } = { emergencyId };
    if (filters.status !== undefined) listQuery.status = filters.status;
    const snapshots = await this.listUc.execute(listQuery);
    return snapshots.map(mapToListItem);
  }

  @Get('emergencies/:emergencyId/reunification/search')
  @UseGuards(JwtAuthGuard, RequireCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search missing person reports by documentId (coordinator only)',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiQuery({ name: 'documentId', required: true, type: String })
  @ApiOkResponse({ type: MissingPersonReportDetailDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async searchByDocumentId(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query('documentId') documentId: string,
  ): Promise<MissingPersonReportDetailDto[]> {
    const snapshots = await this.searchByDocumentIdUc.execute({
      emergencyId,
      documentId,
    });
    return snapshots.map(mapToDetail);
  }

  @Get('emergencies/:emergencyId/reunification/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get my missing person reports for an emergency (authenticated user)',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiOkResponse({ type: MyReportResponseDto, isArray: true })
  @ApiUnauthorizedResponse()
  async getMyReports(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<MyReportResponseDto[]> {
    const snapshots = await this.getMyReportsUc.execute({
      emergencyId,
      userId: req.user!.id,
    });
    return snapshots.map(mapToMyReport);
  }

  // ── Entity-scoped coordinator endpoints (by reportId) ────────────────────

  @Get('reunification/:reportId')
  @UseGuards(JwtAuthGuard, RequireReunificationReportCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get full detail of a missing person report (coordinator only)',
  })
  @ApiParam({ name: 'reportId', format: 'uuid' })
  @ApiOkResponse({ type: MissingPersonReportDetailDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async getReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<MissingPersonReportDetailDto> {
    const snapshot = await this.getUc.execute({ reportId });
    return mapToDetail(snapshot);
  }

  @Patch('reunification/:reportId/status')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RequireReunificationReportCoordinatorGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update the status of a missing person report (coordinator only)',
  })
  @ApiParam({ name: 'reportId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Status updated' })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({ description: 'Invalid status transition' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async updateStatus(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateReportStatusDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const updateCmd: import('../../application/update-report-status').UpdateReportStatusCommand =
      {
        reportId,
        status: dto.status,
        reviewedByUserId: req.user!.id,
      };
    if (dto.matchNote !== undefined) updateCmd.matchNote = dto.matchNote;
    await this.updateStatusUc.execute(updateCmd);
  }

  @Post('reunification/:reportId/sightings')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Register a sighting for a missing person report (authenticated users)',
  })
  @ApiParam({ name: 'reportId', format: 'uuid' })
  @ApiCreatedResponse({ type: RegisterSightingResponseDto })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: 'Report is matched or closed',
  })
  @ApiUnauthorizedResponse()
  async registerSighting(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: RegisterSightingDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<RegisterSightingResponseDto> {
    const result = await this.registerSightingUc.execute({
      reportId,
      reportedByUserId: req.user?.id ?? null,
      reportedByName: req.user ? null : null, // name comes from token
      location: dto.location,
      coords: dto.coords ?? null,
      note: dto.note,
    });
    const response = new RegisterSightingResponseDto();
    response.sightingId = result.sightingId;
    return response;
  }
}
