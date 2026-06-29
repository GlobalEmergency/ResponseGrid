import {
  BadRequestException,
  ConflictException,
  Controller,
  Body,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
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
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import { isCoreCategory } from '../../domain/category';
import { CategoryDefinition } from '../../domain/category-definition';
import { CreateCategory } from '../../application/create-category';
import {
  CategoryAlreadyExistsError,
  CategoryImmutableSlugError,
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from '../../application/category-admin.errors';
import { ListCategories } from '../../application/list-categories';
import {
  UpdateCategory,
  UpdateCategoryCommand,
} from '../../application/update-category';
import {
  CategoryAdminDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './admin-category.dto';
import { localizedCategoryText, resolveLocale } from './locale';
import { CategoryWriteInput } from '../../domain/ports/category.repository';

@ApiTags('categories-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(
    private readonly listCategories: ListCategories,
    private readonly createCategory: CreateCategory,
    private readonly updateCategory: UpdateCategory,
  ) {}

  @Get()
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'List the full category taxonomy for admin (archived included)',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description:
      'Fallback locale header (es, en or a custom translation locale)',
  })
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
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CategoryAdminDto[]> {
    const locale = resolveLocale(localeParam, acceptLanguage);
    const categories = await this.listCategories.execute({
      includeArchived: true,
    });
    return categories.map((category) => this.toDto(category, locale));
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
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CategoryAdminDto> {
    const locale = resolveLocale(localeParam, acceptLanguage);
    const created = await this.runCategoryCommand(() =>
      this.createCategory.execute(this.toWriteInput(dto)),
    );
    return this.toDto(created, locale);
  }

  @Patch(':slug')
  @RequirePermission('catalogue:manage')
  @ApiOperation({ summary: 'Update a category, subcategory or archive flag' })
  @ApiParam({ name: 'slug', description: 'Current category slug' })
  @ApiOkResponse({ type: CategoryAdminDto })
  @ApiBadRequestResponse({ description: 'Invalid category payload' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({ description: 'Category slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateCategoryDto,
    @Query('locale') localeParam?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CategoryAdminDto> {
    const locale = resolveLocale(localeParam, acceptLanguage);
    const updated = await this.runCategoryCommand(() =>
      this.updateCategory.execute(slug, this.toUpdateCommand(dto)),
    );
    return this.toDto(updated, locale);
  }

  @Delete(':slug')
  @HttpCode(204)
  @RequirePermission('catalogue:manage')
  @ApiOperation({
    summary: 'Archive a custom category (core slugs are protected)',
  })
  @ApiParam({ name: 'slug', description: 'Category slug to archive' })
  @ApiNoContentResponse({ description: 'Category archived' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({
    description: 'Core category slug cannot be archived by delete',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Missing catalogue:manage permission' })
  async delete(@Param('slug') slug: string): Promise<void> {
    if (isCoreCategory(slug)) {
      throw new BadRequestException(
        `Core category slug cannot be deleted: ${slug}`,
      );
    }
    await this.runCategoryCommand(() =>
      this.updateCategory.execute(slug, { archived: true }),
    );
  }

  private toDto(
    category: CategoryDefinition,
    locale: string,
  ): CategoryAdminDto {
    return {
      slug: category.slug,
      label: localizedCategoryText(category, locale),
      labelEs: category.labelEs,
      labelEn: category.labelEn,
      parentSlug: category.parentSlug,
      vertical: category.vertical,
      sort: category.sort,
      archivedAt: category.archivedAt
        ? category.archivedAt.toISOString()
        : null,
      translations: category.translations.map((translation) => ({
        locale: translation.locale,
        label: translation.label,
      })),
    };
  }

  private toWriteInput(dto: CreateCategoryDto): CategoryWriteInput {
    return {
      slug: dto.slug,
      labelEs: dto.labelEs,
      labelEn: dto.labelEn,
      parentSlug: dto.parentSlug ?? null,
      vertical: dto.vertical,
      sort: dto.sort,
      archivedAt: null,
      translations: dto.translations ?? [],
    };
  }

  private toUpdateCommand(dto: UpdateCategoryDto): UpdateCategoryCommand {
    return {
      labelEs: dto.labelEs,
      labelEn: dto.labelEn,
      parentSlug: dto.parentSlug,
      vertical: dto.vertical,
      sort: dto.sort,
      archived: dto.archived,
      translations: dto.translations,
    };
  }

  private async runCategoryCommand<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof CategoryNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof CategoryAlreadyExistsError ||
      error instanceof CategoryParentNotFoundError ||
      error instanceof CategoryImmutableSlugError ||
      error instanceof CategoryValidationError
    ) {
      return error instanceof CategoryAlreadyExistsError
        ? new ConflictException(error.message)
        : new BadRequestException(error.message);
    }
    return error instanceof Error ? error : new Error('Unknown category error');
  }
}
