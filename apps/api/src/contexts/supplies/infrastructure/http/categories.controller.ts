import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ListCategories } from '../../application/list-categories';
import { CategoryDto } from './category-response.dto';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly listCategories: ListCategories) {}

  @Get('categories')
  @ApiOperation({
    summary: 'List the shared category taxonomy (slug + labels + hierarchy)',
  })
  @ApiOkResponse({ description: 'The category taxonomy', type: [CategoryDto] })
  list(): Promise<CategoryDto[]> {
    return this.listCategories.execute();
  }
}
