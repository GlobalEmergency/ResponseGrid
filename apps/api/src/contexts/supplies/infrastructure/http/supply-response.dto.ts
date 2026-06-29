import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SupplyStatus } from '../../domain/supply';

export class SupplyDto {
  @ApiProperty({
    format: 'uuid',
    example: 'cf8da6e3-7b91-52ff-8cf7-bbff50786c35',
  })
  id!: string;

  @ApiProperty({ example: 'INS-001' })
  code!: string;

  @ApiProperty({ example: 'Agua potable (botellón 18L)' })
  name!: string;

  @ApiProperty({ example: 'Agua potable (botellón 18L)' })
  nameEs!: string;

  @ApiPropertyOptional({
    example: 'Water (18L jug)',
    nullable: true,
    type: String,
  })
  nameEn!: string | null;

  @ApiProperty({ example: 'food' })
  categorySlug!: string;

  @ApiProperty({ example: 'Alimentos' })
  categoryLabel!: string;

  @ApiProperty({ example: 'Alimentos' })
  categoryLabelEs!: string;

  @ApiPropertyOptional({ example: 'Food', nullable: true, type: String })
  categoryLabelEn!: string | null;

  @ApiPropertyOptional({ example: 'und', nullable: true, type: String })
  defaultUnit!: string | null;

  @ApiProperty({
    type: Object,
    example: { size: '18L' },
    description: 'Structured attributes for variants and catalog metadata',
  })
  attributes!: Record<string, unknown>;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    type: String,
    example: null,
    description: 'Parent supply id when this item is a variant',
  })
  variantOfId!: string | null;

  @ApiProperty({ enum: ['active', 'archived'], example: 'active' })
  status!: SupplyStatus;

  @ApiPropertyOptional({
    example: '⚠️ Anotar volumen real en Obs si difiere',
    nullable: true,
    type: String,
  })
  registrationNotes!: string | null;

  @ApiProperty({
    type: [String],
    example: ['Agua embotellada', 'botellón'],
    description: 'Known aliases for the canonical supply',
  })
  aliases!: string[];
}
