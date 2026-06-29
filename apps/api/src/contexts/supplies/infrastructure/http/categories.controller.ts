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
import { localizedText, resolveLocale } from './locale';

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
    description: 'Fallback locale header (es or en)',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Preferred locale',
  })
  @ApiOkResponse({ description: 'The category taxonomy', type: [CategoryDto] })
  async list(
    @Query('locale') localeParam?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CategoryDto[]> {
    const locale = resolveLocale(localeParam, acceptLanguage);
    const categories = await this.listCategories.execute();
    return categories.map((category) => ({
      slug: category.slug,
      label: localizedText(category.labelEs, category.labelEn, locale),
      labelEs: category.labelEs,
      labelEn: category.labelEn,
      parentSlug: category.parentSlug,
      vertical: category.vertical,
      sort: category.sort,
    }));
  }
}
