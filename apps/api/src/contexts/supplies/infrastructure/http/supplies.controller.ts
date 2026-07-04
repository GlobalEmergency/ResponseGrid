import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetSupply } from '../../application/get-supply';
import { ListSupplies } from '../../application/list-supplies';
import { PublicSupplyRecord } from '../../domain/ports/supply-catalog.read-model';
import { localize } from '../../domain/localized-text';
import { resolveLocale } from './locale';
import { SuppliesQueryDto } from './supplies-query.dto';
import { SupplyDto } from './supply-response.dto';

@ApiTags('supplies')
@Controller('supplies')
export class SuppliesController {
  constructor(
    private readonly listSupplies: ListSupplies,
    private readonly getSupply: GetSupply,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Search the shared supply catalog (canonical names, aliases and codes)',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Fallback locale header (es or en)',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Autocomplete term' })
  @ApiQuery({
    name: 'categorySlug',
    required: false,
    description: 'Filter by category slug',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Preferred locale',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max items to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'How many items to skip',
  })
  @ApiOkResponse({ description: 'Matched supplies', type: [SupplyDto] })
  async list(
    @Query() query: SuppliesQueryDto,
    @Headers() headers: Record<string, string>,
  ): Promise<SupplyDto[]> {
    const locale = resolveLocale(query.locale, headers['accept-language']);
    const catalog = await this.listSupplies.execute({
      q: query.q,
      categorySlug: query.categorySlug,
      locale,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
    return catalog.map((record) => this.toDto(record, locale));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supply by id' })
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
  @ApiOkResponse({ description: 'Supply detail', type: SupplyDto })
  async get(
    @Param('id') id: string,
    @Query('locale') localeParam: string | undefined,
    @Headers() headers: Record<string, string>,
  ): Promise<SupplyDto> {
    const locale = resolveLocale(localeParam, headers['accept-language']);
    const record = await this.getSupply.execute(id);
    if (!record) {
      throw new NotFoundException(`Supply ${id} not found`);
    }
    return this.toDto(record, locale);
  }

  private toDto(record: PublicSupplyRecord, locale: string): SupplyDto {
    return {
      id: record.id,
      code: record.code,
      name: localize(record.name, record.translations, locale),
      categorySlug: record.categorySlug,
      categoryLabel: localize(
        record.categoryLabel,
        record.categoryTranslations,
        locale,
      ),
      defaultUnit: record.defaultUnit,
      attributes: record.attributes,
      variantOfId: record.variantOfId,
      aliases: record.aliases,
    };
  }
}
