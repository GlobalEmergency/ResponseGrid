import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsUUID,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategorySlugProperty } from './category-slug.validator';

/**
 * SupplyLineDto — the single request shape for a line of aid material
 * (a {@link SupplyLine}): name + quantity + unit + category + presentation +
 * optional expiresAt freshness date.
 * Shared by every context that accepts supply lines (needs, resources
 * inventory) so the contract stays identical.
 */
export class SupplyLineDto {
  @ApiProperty({ example: 'Water bottles', description: 'Name of the supply' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
    nullable: true,
    type: String,
    description: 'Optional soft link to the canonical supply master data.',
  })
  @IsOptional()
  @IsUUID()
  supplyId?: string | null;

  @ApiProperty({ example: 100, description: 'Quantity (positive integer)' })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({
    example: 'liters',
    description: 'Unit of measurement (optional)',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @CategorySlugProperty()
  category!: string;

  @ApiPropertyOptional({
    example: 'ampolla',
    description:
      'Presentation / route of administration: ampolla, EV (intravenoso), inhalador, pastilla, jarabe… Optional, free-form (#61).',
  })
  @IsOptional()
  @IsString()
  presentation?: string;

  @ApiPropertyOptional({
    example: '2026-07-01',
    format: 'date',
    description:
      'Optional freshness date for the line, expressed as an ISO date (YYYY-MM-DD).',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiresAt?: string;
}

/**
 * SupplyLineResponseDto — the single response shape for a supply line.
 */
export class SupplyLineResponseDto {
  @ApiProperty({ example: 'Water bottles' })
  name!: string;

  @ApiProperty({
    example: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
    nullable: true,
    type: String,
    description: 'Optional soft link to the canonical supply master data.',
  })
  supplyId!: string | null;

  @ApiProperty({ example: 100 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'liters', nullable: true, type: String })
  unit!: string | null;

  @ApiProperty({
    type: String,
    example: 'water',
    description:
      'Slug de categoría de material (data-driven, lowercase snake_case).',
  })
  category!: string;

  @ApiPropertyOptional({
    example: 'ampolla',
    nullable: true,
    type: String,
    description:
      'Presentation / route of administration (ampolla, EV, inhalador…) — #61.',
  })
  presentation!: string | null;

  @ApiPropertyOptional({
    example: '2026-07-01',
    nullable: true,
    type: String,
    format: 'date',
    description:
      'Optional freshness date for the line, expressed as an ISO date (YYYY-MM-DD).',
  })
  expiresAt?: string | null;
}
