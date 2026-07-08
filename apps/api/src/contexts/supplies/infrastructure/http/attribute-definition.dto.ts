import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ATTRIBUTE_DATA_TYPES } from '@globalemergency/warehouse-core/catalog';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export class AttributeOptionDto {
  @ApiProperty({ example: 'tableta' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'Tableta' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateAttributeDefinitionDto {
  @ApiProperty({
    example: 'medicines',
    description: 'Slug de la categoría (familia) a la que se ancla',
  })
  @IsString()
  categorySlug!: string;

  @ApiProperty({
    example: 'principio_activo',
    description: 'Clave del atributo (lowercase snake_case)',
  })
  @IsString()
  @Matches(KEY_PATTERN, {
    message: 'key must be a lowercase snake_case token (^[a-z][a-z0-9_]*$)',
  })
  key!: string;

  @ApiProperty({
    enum: ATTRIBUTE_DATA_TYPES,
    example: 'text',
  })
  @IsIn(ATTRIBUTE_DATA_TYPES)
  dataType!: (typeof ATTRIBUTE_DATA_TYPES)[number];

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    type: [AttributeOptionDto],
    description: 'Opciones (sólo para dataType=enum)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeOptionDto)
  options?: AttributeOptionDto[];

  @ApiPropertyOptional({
    example: 'mg',
    nullable: true,
    description: 'Unidad (sólo para dataType=number|quantity)',
  })
  @IsOptional()
  @IsString()
  unit?: string | null;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;
}

export class AttributeDefinitionDto {
  @ApiProperty({ example: 'medicines' })
  categorySlug!: string;

  @ApiProperty({ example: 'principio_activo' })
  key!: string;

  @ApiProperty({ enum: ATTRIBUTE_DATA_TYPES, example: 'text' })
  dataType!: (typeof ATTRIBUTE_DATA_TYPES)[number];

  @ApiProperty({ example: false })
  required!: boolean;

  @ApiProperty({
    type: [AttributeOptionDto],
    nullable: true,
    description: 'Opciones del enum, o null',
  })
  options!: AttributeOptionDto[] | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  unit!: string | null;

  @ApiProperty({ example: 0 })
  sort!: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Marca de archivado (soft-delete)',
  })
  archivedAt!: string | null;
}
