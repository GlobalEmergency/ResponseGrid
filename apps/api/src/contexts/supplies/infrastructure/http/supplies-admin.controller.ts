import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSupply } from '../../application/create-supply';
import { EditSupply } from '../../application/edit-supply';
import { ArchiveSupply } from '../../application/archive-supply';
import { RestoreSupply } from '../../application/restore-supply';
import { AddSupplyAlias } from '../../application/add-supply-alias';
import { RemoveSupplyAlias } from '../../application/remove-supply-alias';
import { MergeSupplies } from '../../application/merge-supplies';
import { ListSuppliesAdmin } from '../../application/list-supplies-admin';
import { GetSupplyAdmin } from '../../application/get-supply-admin';
import { AdminSupplyView } from '../../application/admin-supply-view';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import { CachingSupplyCatalogReadModel } from '../caching-supply-catalog.read-model';
import { SuppliesDomainExceptionFilter } from './supplies-domain-exception.filter';
import {
  AddSupplyAliasDto,
  CreateSupplyDto,
  EditSupplyDto,
  ListSuppliesAdminQueryDto,
  MergeSuppliesDto,
} from './supplies-admin.dto';
import {
  AdminSupplyDto,
  CreateSupplyResponseDto,
} from './admin-supply-response.dto';

/**
 * API de gestión del catálogo maestro de insumos (#222). Cerrada a admins
 * (`catalogue:manage`, scope plataforma): alta/edición/archivado de insumos y
 * variantes, gestión de alias y fusión de duplicados. El catálogo es global,
 * así que las rutas no llevan scope de emergencia: el PermissionGuard cae al
 * scope plataforma y sólo lo conceden los grants de plataforma (platform_admin).
 */
@ApiTags('supplies-admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Falta el permiso catalogue:manage' })
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseFilters(SuppliesDomainExceptionFilter)
@RequirePermission('catalogue:manage')
@Controller('admin/supplies')
export class SuppliesAdminController {
  constructor(
    private readonly createSupply: CreateSupply,
    private readonly editSupply: EditSupply,
    private readonly archiveSupply: ArchiveSupply,
    private readonly restoreSupply: RestoreSupply,
    private readonly addSupplyAlias: AddSupplyAlias,
    private readonly removeSupplyAlias: RemoveSupplyAlias,
    private readonly mergeSupplies: MergeSupplies,
    private readonly listSuppliesAdmin: ListSuppliesAdmin,
    private readonly getSupplyAdmin: GetSupplyAdmin,
    private readonly cache: CachingSupplyCatalogReadModel,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear un insumo (asigna código INS-NNNN)' })
  @ApiCreatedResponse({ type: CreateSupplyResponseDto })
  async create(@Body() dto: CreateSupplyDto): Promise<CreateSupplyResponseDto> {
    const result = await this.createSupply.execute({
      name: dto.name,
      categorySlug: dto.categorySlug,
      defaultUnit: dto.defaultUnit ?? null,
      attributes: dto.attributes ?? null,
      registrationNotes: dto.registrationNotes ?? null,
      variantOfId: dto.variantOfId ?? null,
    });
    this.cache.invalidate();
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo (incluye archivados)' })
  @ApiOkResponse({ type: [AdminSupplyDto] })
  async list(
    @Query() query: ListSuppliesAdminQueryDto,
  ): Promise<AdminSupplyView[]> {
    // El DTO comparte forma con SupplyListFilter (campos opcionales): se pasa
    // tal cual para no introducir claves con `undefined` explícito
    // (exactOptionalPropertyTypes).
    return this.listSuppliesAdmin.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de gestión de un insumo' })
  @ApiOkResponse({ type: AdminSupplyDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminSupplyView> {
    return this.getSupplyAdmin.execute(id);
  }

  @Patch(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Editar un insumo (code no editable)' })
  @ApiNoContentResponse()
  async edit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditSupplyDto,
  ): Promise<void> {
    await this.editSupply.execute({ id, ...dto });
    this.cache.invalidate();
  }

  @Post(':id/archive')
  @HttpCode(204)
  @ApiOperation({ summary: 'Archivar un insumo' })
  @ApiNoContentResponse()
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.archiveSupply.execute(id);
    this.cache.invalidate();
  }

  @Post(':id/restore')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reactivar un insumo archivado' })
  @ApiNoContentResponse()
  async restore(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.restoreSupply.execute(id);
    this.cache.invalidate();
  }

  @Post(':id/aliases')
  @HttpCode(204)
  @ApiOperation({ summary: 'Añadir un alias/sinónimo a un insumo' })
  @ApiNoContentResponse()
  async addAlias(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSupplyAliasDto,
  ): Promise<void> {
    await this.addSupplyAlias.execute({ supplyId: id, term: dto.term });
    this.cache.invalidate();
  }

  @Delete(':id/aliases/:aliasNorm')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un alias del catálogo' })
  @ApiNoContentResponse()
  async removeAlias(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('aliasNorm') aliasNorm: string,
  ): Promise<void> {
    await this.removeSupplyAlias.execute({ aliasNorm });
    this.cache.invalidate();
  }

  @Post('merge')
  @HttpCode(204)
  @ApiOperation({ summary: 'Fusionar un insumo duplicado en el canónico' })
  @ApiNoContentResponse()
  async merge(@Body() dto: MergeSuppliesDto): Promise<void> {
    await this.mergeSupplies.execute({
      sourceId: dto.sourceId,
      targetId: dto.targetId,
    });
    this.cache.invalidate();
  }
}
