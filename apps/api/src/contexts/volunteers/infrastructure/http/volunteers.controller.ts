import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
} from '@nestjs/swagger';
import { Request } from 'express';
import { RegisterVolunteer } from '../../application/register-volunteer';
import { GetVolunteerRoster } from '../../application/get-volunteer-roster';
import { UpdateVolunteerStatus } from '../../application/update-volunteer-status';
import { GetMyVolunteerProfile } from '../../application/get-my-volunteer-profile';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  RegisterVolunteerDto,
  UpdateVolunteerStatusDto,
  VolunteerRosterFiltersDto,
} from './dto';
import { RegisterVolunteerResponseDto, VolunteerViewDto } from './response.dto';
import { VolunteerDomainExceptionFilter } from './domain-exception.filter';
import {
  VolunteerSkill,
  Availability,
  Vehicle,
  VolunteerStatus,
} from '../../domain/volunteer-enums';

@ApiTags('volunteers')
@Controller()
@UseFilters(VolunteerDomainExceptionFilter)
export class VolunteersController {
  constructor(
    private readonly registerUc: RegisterVolunteer,
    private readonly getRosterUc: GetVolunteerRoster,
    private readonly updateStatusUc: UpdateVolunteerStatus,
    private readonly getMyProfileUc: GetMyVolunteerProfile,
  ) {}

  @Post('emergencies/:emergencyId/volunteers')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Register as a volunteer for an emergency (requires authentication)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Volunteer registered',
    type: RegisterVolunteerResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiConflictResponse({
    description: 'Emergency not accepting volunteers (paused/closed)',
  })
  async registerVolunteer(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: RegisterVolunteerDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<RegisterVolunteerResponseDto> {
    return this.registerUc.execute({
      emergencyId,
      userId: req.user!.id,
      name: dto.name,
      contact: dto.contact,
      municipality: dto.municipality,
      skills: dto.skills,
      availability: dto.availability,
      vehicle: dto.vehicle,
      consentAccepted: dto.consentAccepted,
    });
  }

  @Get('emergencies/:emergencyId/volunteers')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('volunteer:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get volunteer roster for an emergency (coordinator only)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiQuery({ name: 'skill', required: false, enum: VolunteerSkill })
  @ApiQuery({ name: 'availability', required: false, enum: Availability })
  @ApiQuery({ name: 'vehicle', required: false, enum: Vehicle })
  @ApiQuery({ name: 'status', required: false, enum: VolunteerStatus })
  @ApiOkResponse({
    description: 'List of volunteers',
    type: VolunteerViewDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async getRosterForEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() filters: VolunteerRosterFiltersDto,
  ): Promise<VolunteerViewDto[]> {
    const rosterFilters: {
      skill?: VolunteerSkill;
      availability?: Availability;
      vehicle?: Vehicle;
      status?: VolunteerStatus;
    } = {};
    if (filters.skill !== undefined) rosterFilters.skill = filters.skill;
    if (filters.availability !== undefined)
      rosterFilters.availability = filters.availability;
    if (filters.vehicle !== undefined) rosterFilters.vehicle = filters.vehicle;
    if (filters.status !== undefined) rosterFilters.status = filters.status;

    return this.getRosterUc.execute({
      emergencyId,
      filters: rosterFilters,
    });
  }

  @Post('volunteers/:volunteerId/status')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('volunteer:assign')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update volunteer status (coordinator of the volunteer's emergency only)",
  })
  @ApiParam({
    name: 'volunteerId',
    description: 'Volunteer UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Status updated' })
  @ApiNotFoundResponse({ description: 'Volunteer not found' })
  @ApiBadRequestResponse({ description: 'Invalid status or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async updateVolunteerStatus(
    @Param('volunteerId', ParseUUIDPipe) volunteerId: string,
    @Body() dto: UpdateVolunteerStatusDto,
  ): Promise<void> {
    await this.updateStatusUc.execute({ volunteerId, status: dto.status });
  }

  @Get('emergencies/:emergencyId/volunteers/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my volunteer profile for an emergency' })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'My volunteer profile',
    type: VolunteerViewDto,
  })
  @ApiNotFoundResponse({
    description: 'Not registered as volunteer in this emergency',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async fetchMyProfile(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<VolunteerViewDto> {
    const profile = await this.getMyProfileUc.execute({
      emergencyId,
      userId: req.user!.id,
    });
    if (!profile) {
      throw new NotFoundException(
        'Not registered as volunteer in this emergency',
      );
    }
    return profile;
  }
}
