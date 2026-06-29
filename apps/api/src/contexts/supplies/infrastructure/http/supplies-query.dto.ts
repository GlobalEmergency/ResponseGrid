import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SuppliesQueryDto {
  @ApiPropertyOptional({
    example: 'advil',
    description: 'Autocomplete term: resolves canonical names, aliases or code',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: 'medical_supplies',
    description: 'Filter by category slug',
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred locale (falls back to es)',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 50,
    description: 'Maximum items to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: 'Number of items to skip',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
