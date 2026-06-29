import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORY_SLUG_PATTERN = /^[a-z0-9_]+$/;

export class CategoryTranslationDto {
  @ApiProperty({ example: 'fr' })
  @IsString()
  locale!: string;

  @ApiProperty({ example: 'Nourriture' })
  @IsString()
  label!: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'baby_food' })
  @IsString()
  @Matches(CATEGORY_SLUG_PATTERN, {
    message: 'slug must use lowercase letters, numbers or underscores',
  })
  slug!: string;

  @ApiProperty({ example: 'Alimentos para bebé' })
  @IsString()
  labelEs!: string;

  @ApiProperty({ example: 'Baby food' })
  @IsString()
  labelEn!: string;

  @ApiPropertyOptional({
    example: 'food',
    nullable: true,
    description: 'Parent category slug, or null for a top-level category',
  })
  @IsOptional()
  @IsString()
  parentSlug!: string | null;

  @ApiProperty({ example: 'general' })
  @IsString()
  vertical!: string;

  @ApiProperty({ example: 140 })
  @IsInt()
  sort!: number;

  @ApiPropertyOptional({
    type: [CategoryTranslationDto],
    description: 'Additional locale labels to persist in category_translations',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationDto)
  translations?: CategoryTranslationDto[];
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Alimentos para bebé' })
  @IsOptional()
  @IsString()
  labelEs?: string;

  @ApiPropertyOptional({ example: 'Baby food' })
  @IsOptional()
  @IsString()
  labelEn?: string;

  @ApiPropertyOptional({
    example: 'food',
    nullable: true,
    description: 'Parent category slug, or null for a top-level category',
  })
  @IsOptional()
  @IsString()
  parentSlug?: string | null;

  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  vertical?: string;

  @ApiPropertyOptional({ example: 140 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({
    type: [CategoryTranslationDto],
    description: 'Replace the category_translation rows with this set',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationDto)
  translations?: CategoryTranslationDto[];

  @ApiPropertyOptional({
    example: false,
    description: 'True to hide/archive the category, false to restore it',
  })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class CategoryAdminDto {
  @ApiProperty({ example: 'baby_food' })
  slug!: string;

  @ApiProperty({
    example: 'Alimentos para bebé',
    description: 'Localized label',
  })
  label!: string;

  @ApiProperty({ example: 'Alimentos para bebé' })
  labelEs!: string;

  @ApiProperty({ example: 'Baby food' })
  labelEn!: string;

  @ApiProperty({
    example: 'food',
    nullable: true,
    type: String,
    description: 'Parent category slug, or null for a top-level category',
  })
  parentSlug!: string | null;

  @ApiProperty({ example: 'general' })
  vertical!: string;

  @ApiProperty({ example: 140 })
  sort!: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Soft-archive timestamp',
  })
  archivedAt!: string | null;

  @ApiProperty({ type: [CategoryTranslationDto] })
  translations!: CategoryTranslationDto[];
}
