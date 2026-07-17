import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SUPPLY_NATURES,
  type SupplyNature,
} from '@globalemergency/warehouse-core/catalog';
import { SupplyTranslationDto } from './supplies-admin.dto';

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

  @ApiPropertyOptional({
    enum: SUPPLY_NATURES,
    nullable: true,
    example: 'fungible',
    description:
      'Naturaleza logística (#269): fungible | reusable | human. Null = sin clasificar.',
  })
  nature!: SupplyNature | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description:
      'Códigos externos estándar para interop (#398): mapa namespace→código. `{}` si no tiene.',
    example: { unspsc: '51101500', hxl: '#item+code' },
  })
  externalCodes!: Record<string, string>;

  @ApiProperty({ type: [String], example: ['agua embotellada', 'botellon'] })
  aliases!: string[];

  @ApiProperty({
    type: [SupplyTranslationDto],
    description: 'Traducciones del nombre por idioma (i18n, #320)',
    example: [{ locale: 'en', name: 'Drinking water (1.5L bottle)' }],
  })
  translations!: SupplyTranslationDto[];
}

export class CreateSupplyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INS-0212' })
  code!: string;
}
