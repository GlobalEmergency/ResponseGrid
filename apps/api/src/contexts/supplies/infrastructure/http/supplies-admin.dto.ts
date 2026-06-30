import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Alta de un insumo. `code` lo asigna el servidor (secuencia INS-NNNN). */
export class CreateSupplyDto {
  @ApiProperty({ example: 'Agua potable (botella 1.5L)' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'water', description: 'Slug de categoría existente' })
  @IsString()
  @IsNotEmpty()
  categorySlug!: string;

  @ApiPropertyOptional({ example: 'und' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  defaultUnit?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Atributos estructurados (jsonb)',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Notas internas de gestión' })
  @IsOptional()
  @IsString()
  registrationNotes?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Si es variante, id del insumo padre (debe existir)',
  })
  @IsOptional()
  @IsUUID()
  variantOfId?: string | null;
}

/** Edición parcial de un insumo. `code` no es editable. */
export class EditSupplyDto {
  @ApiPropertyOptional({ example: 'Agua mineral' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'food' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categorySlug?: string;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  defaultUnit?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNotes?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantOfId?: string | null;
}

export class AddSupplyAliasDto {
  @ApiProperty({
    example: 'agua embotellada',
    description: 'Término/sinónimo; se normaliza en el servidor',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  term!: string;
}

export class MergeSuppliesDto {
  @ApiProperty({ format: 'uuid', description: 'Insumo duplicado (se archiva)' })
  @IsUUID()
  sourceId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Insumo canónico (conserva todo)',
  })
  @IsUUID()
  targetId!: string;
}

export class ListSuppliesAdminQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda por código o nombre' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtra por categoría' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';
}
