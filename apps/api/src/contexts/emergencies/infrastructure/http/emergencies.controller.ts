import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CreateEmergency } from '../../application/create-emergency';
import { ListActiveEmergencies } from '../../application/list-active-emergencies';
import { ListMyEmergencies } from '../../application/list-my-emergencies';
import { GetEmergencyBySlug } from '../../application/get-emergency-by-slug';
import { PauseEmergency } from '../../application/pause-emergency';
import { ResumeEmergency } from '../../application/resume-emergency';
import { PublishAnnouncement } from '../../application/publish-announcement';
import { CreateEmergencyFromTemplate } from '../../application/create-emergency-from-template';
import {
  CreateEmergencyDto,
  CreateEmergencyFromTemplateDto,
  CreateEmergencyResponseDto,
  EmergencyViewDto,
  MyEmergencyViewDto,
  PublishAnnouncementDto,
} from './dto';
import { EmergencyExceptionFilter } from './emergency-exception.filter';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';

@ApiTags('emergencies')
@Controller('emergencies')
@UseFilters(EmergencyExceptionFilter)
export class EmergenciesController {
  constructor(
    private readonly create: CreateEmergency,
    private readonly listActive: ListActiveEmergencies,
    private readonly listMy: ListMyEmergencies,
    private readonly getBySlug: GetEmergencyBySlug,
    private readonly pause: PauseEmergency,
    private readonly resume: ResumeEmergency,
    private readonly publishAnnouncement: PublishAnnouncement,
    private readonly createFromTemplate: CreateEmergencyFromTemplate,
  ) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('emergency:create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an emergency (emergency:create)' })
  @ApiCreatedResponse({
    description: 'Emergency created',
    type: CreateEmergencyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'emergency:create required' })
  async createEmergency(
    @Body() dto: CreateEmergencyDto,
  ): Promise<CreateEmergencyResponseDto> {
    const cmd =
      dto.slug !== undefined
        ? { name: dto.name, slug: dto.slug, country: dto.country }
        : { name: dto.name, country: dto.country };
    return this.create.execute(cmd);
  }

  @Get()
  @ApiOperation({ summary: 'List active emergencies' })
  @ApiOkResponse({
    description: 'List of active emergencies',
    type: [EmergencyViewDto],
  })
  async list(): Promise<EmergencyViewDto[]> {
    return this.listActive.execute();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List the emergencies the authenticated principal is granted into (any status)',
  })
  @ApiOkResponse({
    description:
      'Emergencies the principal holds a grant in — including paused/closed — each with the role ids held at that scope',
    type: [MyEmergencyViewDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async listMine(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
  ): Promise<MyEmergencyViewDto[]> {
    return this.listMy.execute(
      req.user.grants.map((g) => ({
        roleId: g.roleId,
        scope: g.scope,
        expiresAt: g.expiresAt,
      })),
    );
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get emergency by slug' })
  @ApiOkResponse({ description: 'Emergency found', type: EmergencyViewDto })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  async getBySlugRoute(@Param('slug') slug: string): Promise<EmergencyViewDto> {
    const result = await this.getBySlug.execute({ slug });
    if (!result)
      throw new NotFoundException(`Emergency with slug "${slug}" not found`);
    return result;
  }

  @Post('from-template')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('emergency:create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an emergency from a template (emergency:create)',
  })
  @ApiCreatedResponse({
    description: 'Emergency created from template',
    type: CreateEmergencyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'emergency:create required' })
  async createFromTemplateRoute(
    @Body() dto: CreateEmergencyFromTemplateDto,
  ): Promise<CreateEmergencyResponseDto> {
    return this.createFromTemplate.execute({
      templateId: dto.templateId,
      name: dto.name,
      slug: dto.slug,
      country: dto.country,
    });
  }

  @Post(':emergencyId/pause')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('emergency:pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause an active emergency (coordinator only)' })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Emergency paused' })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  @ApiConflictResponse({
    description: 'Invalid transition (emergency is not active)',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async pauseEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<void> {
    await this.pause.execute({ emergencyId });
  }

  @Post(':emergencyId/resume')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('emergency:resume')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a paused emergency (coordinator only)' })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Emergency resumed' })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  @ApiConflictResponse({
    description: 'Invalid transition (emergency is not paused)',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async resumeEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<void> {
    await this.resume.execute({ emergencyId });
  }

  @Put(':emergencyId/announcement')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('emergency:announce')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Publish official announcement for an emergency (coordinator only)',
  })
  @ApiParam({
    name: 'emergencyId',
    description: 'Emergency UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Announcement published' })
  @ApiNotFoundResponse({ description: 'Emergency not found' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async publishEmergencyAnnouncement(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: PublishAnnouncementDto,
  ): Promise<void> {
    await this.publishAnnouncement.execute({
      emergencyId,
      message: dto.message,
    });
  }
}
