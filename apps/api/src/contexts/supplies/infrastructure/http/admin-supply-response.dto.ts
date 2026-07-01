import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Proyección de GESTIÓN de un insumo (#222). A diferencia de `SupplyDto`
 * (público), expone los campos internos `status` y `registrationNotes`. Sólo la
 * consume la API admin del catálogo (`catalogue:manage`).
 */
export class AdminSupplyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INS-0212' })
  code!: string;

  @ApiProperty({ example: 'Agua potable (botella 1.5L)' })
  name!: string;

  @ApiProperty({ example: 'water' })
  categorySlug!: string;

  @ApiPropertyOptional({ example: 'und', nullable: true, type: String })
  defaultUnit!: string | null;

  @ApiProperty({ type: Object, example: { size: '1.5L' } })
  attributes!: Record<string, unknown>;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  variantOfId!: string | null;

  @ApiProperty({ enum: ['active', 'archived'], example: 'active' })
  status!: 'active' | 'archived';

  @ApiPropertyOptional({ nullable: true, type: String })
  registrationNotes!: string | null;

  @ApiProperty({ type: [String], example: ['agua embotellada', 'botellon'] })
  aliases!: string[];
}

export class CreateSupplyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INS-0212' })
  code!: string;
}
