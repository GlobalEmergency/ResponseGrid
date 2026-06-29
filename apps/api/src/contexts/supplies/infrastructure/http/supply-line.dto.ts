import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../../domain/category';

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

  @ApiProperty({ enum: Category, example: Category.Water })
  @IsEnum(Category)
  category!: Category;

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

  @ApiProperty({ example: 100 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'liters', nullable: true, type: String })
  unit!: string | null;

  @ApiProperty({ enum: Category, example: Category.Water })
  category!: Category;

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
