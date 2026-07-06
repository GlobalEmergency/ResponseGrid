import { ApiProperty } from '@nestjs/swagger';
import type { CategoryKind } from '@globalemergency/warehouse-core/kernel';

/**
 * A category of the shared taxonomy (slug + localized labels + hierarchy).
 * Returned by `GET /categories`.
 */
export class CategoryDto {
  @ApiProperty({
    example: 'medicines',
    description: 'Canonical category slug (stable identifier)',
  })
  slug!: string;

  @ApiProperty({
    example: 'Medicamentos',
    description: 'Etiqueta resuelta en el locale pedido (fallback a `es`)',
  })
  label!: string;

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

  @ApiProperty({
    enum: ['material', 'personnel'],
    example: 'material',
    description:
      'Whether the category is aid material or personnel. Personnel (medical_personnel) is excluded from material pickers.',
  })
  kind!: CategoryKind;
}
