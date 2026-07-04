import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
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
import { CategoryRecord } from '../../domain/category-record';
import { CreateCategory } from '../../application/create-category';
import { UpdateCategory } from '../../application/update-category';
import { DeleteCategory } from '../../application/delete-category';
import { ListAdminCategories } from '../../application/list-admin-categories';
import {
  CategoryAdminDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './admin-category.dto';
import { localizeCategory, parseLocale } from './locale';

/**
 * API INTERNA/admin del catálogo de categorías (#221). Superficie privada:
 * separada del `GET /categories` público (tag `categories-admin`, ruta
 * `/admin/categories`) y protegida por `catalogue:manage`. Los errores de
 * dominio los traduce el `SuppliesDomainExceptionFilter` global (sin try/catch).
 */
@ApiTags('categories-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(
    private readonly listAdminCategories: ListAdminCategories,
    private readonly createCategory: CreateCategory,
    private readonly updateCategory: UpdateCategory,
    private readonly deleteCategory: DeleteCategory,
  ) {}

  @Get()
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'List the full category taxonomy for admin (archived included)',
  })
  @ApiHeader({ name: 'Accept-Language', required: false })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Preferred locale',
  })
  @ApiOkResponse({ type: [CategoryAdminDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async list(
    @Query('locale') localeParam?: string,
    @Headers() headers: Record<string, string> = {},
  ): Promise<CategoryAdminDto[]> {
    const locale = parseLocale(localeParam, headers['accept-language']);
    const records = await this.listAdminCategories.execute({
      includeArchived: true,
    });
    return records.map((record) => this.toDto(record, locale));
  }

  @Post()
  @RequirePermission('catalogue:manage')
  @ApiOperation({ summary: 'Create a category or subcategory' })
  @ApiCreatedResponse({ type: CategoryAdminDto })
  @ApiBadRequestResponse({ description: 'Invalid category payload' })
  @ApiConflictResponse({ description: 'Category slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async create(
    @Body() dto: CreateCategoryDto,
    @Query('locale') localeParam?: string,
    @Headers() headers: Record<string, string> = {},
  ): Promise<CategoryAdminDto> {
    const record = await this.createCategory.execute({
      slug: dto.slug,
      labelEs: dto.labelEs,
      labelEn: dto.labelEn,
      parentSlug: dto.parentSlug ?? null,
      vertical: dto.vertical,
      sort: dto.sort,
      translations: dto.translations,
    });
    return this.toDto(
      record,
      parseLocale(localeParam, headers['accept-language']),
    );
  }

  @Patch(':slug')
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'Update a category (labels, order, parent, translations, archive)',
  })
  @ApiParam({ name: 'slug', description: 'Category slug (immutable)' })
  @ApiOkResponse({ type: CategoryAdminDto })
  @ApiBadRequestResponse({ description: 'Invalid category payload' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateCategoryDto,
    @Query('locale') localeParam?: string,
    @Headers() headers: Record<string, string> = {},
  ): Promise<CategoryAdminDto> {
    const record = await this.updateCategory.execute(slug, {
      labelEs: dto.labelEs,
      labelEn: dto.labelEn,
      parentSlug: dto.parentSlug,
      vertical: dto.vertical,
      sort: dto.sort,
      archived: dto.archived,
      translations: dto.translations,
    });
    return this.toDto(
      record,
      parseLocale(localeParam, headers['accept-language']),
    );
  }

  @Delete(':slug')
  @HttpCode(204)
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'Archive a category (core slugs are protected → 4xx)',
  })
  @ApiParam({ name: 'slug', description: 'Category slug to archive' })
  @ApiNoContentResponse({ description: 'Category archived' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({ description: 'Core category slug cannot be deleted' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async remove(@Param('slug') slug: string): Promise<void> {
    await this.deleteCategory.execute(slug);
  }

  private toDto(record: CategoryRecord, locale: string): CategoryAdminDto {
    return {
      slug: record.slug,
      label: localizeCategory(record, locale),
      labelEs: record.labelEs,
      labelEn: record.labelEn,
      parentSlug: record.parentSlug,
      vertical: record.vertical,
      sort: record.sort,
      archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
      translations: record.translations.map((t) => ({
        locale: t.locale,
        label: t.label,
      })),
    };
  }
}
