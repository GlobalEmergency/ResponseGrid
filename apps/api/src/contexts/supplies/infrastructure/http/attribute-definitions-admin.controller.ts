import {
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import { AttributeDefinition } from '@globalemergency/warehouse-core/catalog';
import { CreateAttributeDefinition } from '../../application/create-attribute-definition';
import { ListAttributeDefinitions } from '../../application/list-attribute-definitions';
import { ArchiveAttributeDefinition } from '../../application/archive-attribute-definition';
import {
  AttributeDefinitionDto,
  CreateAttributeDefinitionDto,
} from './attribute-definition.dto';

/**
 * CRUD admin del metamodelo de atributos data-driven (#396, épica #228). Un
 * admin define, sin desplegar, los campos tipados de cada familia (categoría).
 * Protegido por `catalogue:manage`, como el resto del catálogo admin. Inc 1:
 * definiciones globales (`scopeId` null); la tenencia es Inc 2.
 */
@ApiTags('attribute-definitions-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/attribute-definitions')
export class AttributeDefinitionsAdminController {
  constructor(
    private readonly listDefinitions: ListAttributeDefinitions,
    private readonly createDefinition: CreateAttributeDefinition,
    private readonly archiveDefinition: ArchiveAttributeDefinition,
  ) {}

  @Get()
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'List global attribute definitions, optionally by category',
  })
  @ApiQuery({
    name: 'categorySlug',
    required: false,
    description: 'Filter by the exact category slug',
  })
  @ApiOkResponse({ type: [AttributeDefinitionDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async list(
    @Query('categorySlug') categorySlug?: string,
  ): Promise<AttributeDefinitionDto[]> {
    const definitions = await this.listDefinitions.execute({ categorySlug });
    return definitions.map((d) => this.toDto(d));
  }

  @Post()
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'Create a global attribute definition for a family',
  })
  @ApiCreatedResponse({ type: AttributeDefinitionDto })
  @ApiBadRequestResponse({
    description: 'Invalid attribute definition payload',
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async create(
    @Body() dto: CreateAttributeDefinitionDto,
  ): Promise<AttributeDefinitionDto> {
    const created = await this.createDefinition.execute({
      categorySlug: dto.categorySlug,
      key: dto.key,
      dataType: dto.dataType,
      required: dto.required,
      options: dto.options,
      unit: dto.unit,
      sort: dto.sort,
    });
    return this.toDto(created);
  }

  @Delete(':categorySlug/:key')
  @HttpCode(204)
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'Archive (soft-delete) a global attribute definition',
  })
  @ApiParam({
    name: 'categorySlug',
    description: 'Category slug of the family',
  })
  @ApiParam({ name: 'key', description: 'Attribute key' })
  @ApiNoContentResponse({ description: 'Attribute definition archived' })
  @ApiNotFoundResponse({ description: 'Attribute definition not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async archive(
    @Param('categorySlug') categorySlug: string,
    @Param('key') key: string,
  ): Promise<void> {
    await this.archiveDefinition.execute({ categorySlug, key });
  }

  private toDto(definition: AttributeDefinition): AttributeDefinitionDto {
    return {
      categorySlug: definition.categorySlug,
      key: definition.key,
      dataType: definition.dataType,
      required: definition.required,
      options: definition.options,
      unit: definition.unit,
      sort: definition.sort,
      archivedAt: definition.archivedAt
        ? definition.archivedAt.toISOString()
        : null,
    };
  }
}
