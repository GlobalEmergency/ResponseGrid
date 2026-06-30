import { ApiProperty } from '@nestjs/swagger';

/**
 * A category of the shared taxonomy (slug + localized labels + hierarchy).
 * Returned by `GET /categories`.
 */
export class CategoryDto {
  @ApiProperty({
    example: 'Medicamentos',
    description: 'Localized category label',
  })
  label!: string;

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

  @ApiProperty({
    example: 'MED',
    nullable: true,
    type: String,
    description:
      'Unique 3-letter prefix for supplies in this category, or null if inherited',
  })
  codePrefix!: string | null;
}
