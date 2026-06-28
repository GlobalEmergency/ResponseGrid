import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CreateTemplate } from '../../application/create-template';
import { ListTemplates } from '../../application/list-templates';
import { DeleteTemplate } from '../../application/delete-template';
import {
  CreateTemplateDto,
  CreateTemplateResponseDto,
  TemplateViewDto,
} from './dto';
import { TemplateExceptionFilter } from './template-exception.filter';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { RequireAdminGuard } from '../../../identity/infrastructure/http/require-admin.guard';

@ApiTags('templates')
@Controller('templates')
@UseFilters(TemplateExceptionFilter)
export class TemplatesController {
  constructor(
    private readonly createTemplate: CreateTemplate,
    private readonly listTemplates: ListTemplates,
    private readonly deleteTemplate: DeleteTemplate,
  ) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RequireAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an emergency template (admin only)' })
  @ApiCreatedResponse({
    description: 'Template created',
    type: CreateTemplateResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async create(
    @Body() dto: CreateTemplateDto,
  ): Promise<CreateTemplateResponseDto> {
    return this.createTemplate.execute({
      name: dto.name,
      description: dto.description,
      dontBringList: dto.dontBringList,
      recommendedList: dto.recommendedList,
      ...(dto.defaultAnnouncement !== undefined && {
        defaultAnnouncement: dto.defaultAnnouncement,
      }),
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RequireAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all emergency templates (admin only)' })
  @ApiOkResponse({
    description: 'List of templates',
    type: [TemplateViewDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async list(): Promise<TemplateViewDto[]> {
    return this.listTemplates.execute();
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RequireAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an emergency template (admin only)' })
  @ApiParam({ name: 'id', description: 'Template UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Template deleted' })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteTemplate.execute({ id });
  }
}
