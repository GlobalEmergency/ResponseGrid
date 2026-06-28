import { ApiProperty } from '@nestjs/swagger';

/**
 * A category of the shared taxonomy (slug + localized labels + hierarchy).
 * Returned by `GET /categories`.
 */
export class CategoryDto {
  @ApiProperty({ example: 'medicines' })
  slug!: string;

  @ApiProperty({ example: 'Medicamentos' })
  labelEs!: string;

  @ApiProperty({ example: 'Medicines' })
  labelEn!: string;

  @ApiProperty({
    example: 'medical',
    nullable: true,
    type: String,
    description: 'Parent category slug, or null for a top-level category',
  })
  parentSlug!: string | null;

  @ApiProperty({ example: 'general' })
  vertical!: string;

  @ApiProperty({ example: 41, description: 'Display sort order' })
  sort!: number;
}
