import { Controller, Get, Headers, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { ListCategories } from '../../application/list-categories';
import { CategoryDto } from './category-response.dto';
import { localizedCategoryText, resolveLocale } from './locale';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly listCategories: ListCategories) {}

  @Get('categories')
  @ApiOperation({
    summary: 'List the shared category taxonomy (slug + labels + hierarchy)',
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
  @ApiOkResponse({ description: 'The category taxonomy', type: [CategoryDto] })
  async list(
    @Query('locale') localeParam?: string,
    @Headers() headers: Record<string, string> = {},
  ): Promise<CategoryDto[]> {
    const locale = resolveLocale(localeParam, headers['accept-language']);
    const categories = await this.listCategories.execute();
    return categories.map((category) => ({
      slug: category.slug,
      label: localizedCategoryText(category, locale),
      labelEs: category.labelEs,
      labelEn: category.labelEn,
      parentSlug: category.parentSlug,
      vertical: category.vertical,
      sort: category.sort,
    }));
  }
}
