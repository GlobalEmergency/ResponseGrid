import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CreateEmergency } from '../../application/create-emergency';
import { ListActiveEmergencies } from '../../application/list-active-emergencies';
import { GetEmergencyBySlug } from '../../application/get-emergency-by-slug';
import { CreateEmergencyDto, CreateEmergencyResponseDto, EmergencyViewDto } from './dto';
import { EmergencyExceptionFilter } from './emergency-exception.filter';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { RequireAdminGuard } from '../../../identity/infrastructure/http/require-admin.guard';

@ApiTags('emergencies')
@Controller('emergencies')
@UseFilters(EmergencyExceptionFilter)
export class EmergenciesController {
  constructor(
    private readonly create: CreateEmergency,
    private readonly listActive: ListActiveEmergencies,
    private readonly getBySlug: GetEmergencyBySlug,
  ) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RequireAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an emergency (admin only)' })
  @ApiCreatedResponse({ description: 'Emergency created', type: CreateEmergencyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async createEmergency(@Body() dto: CreateEmergencyDto): Promise<CreateEmergencyResponseDto> {
    const cmd = dto.slug !== undefined
      ? { name: dto.name, slug: dto.slug, country: dto.country }
      : { name: dto.name, country: dto.country };
    return this.create.execute(cmd);
  }

  @Get()
  @ApiOperation({ summary: 'List active emergencies' })
  @ApiOkResponse({ description: 'List of active emergencies', type: [EmergencyViewDto] })
  async list(): Promise<EmergencyViewDto[]> {
    return this.listActive.execute();
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get emergency by slug' })
  @ApiOkResponse({ description: 'Emergency found', type: EmergencyViewDto })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  async getBySlugRoute(@Param('slug') slug: string): Promise<EmergencyViewDto> {
    const result = await this.getBySlug.execute({ slug });
    if (!result) throw new NotFoundException(`Emergency with slug "${slug}" not found`);
    return result;
  }
}
