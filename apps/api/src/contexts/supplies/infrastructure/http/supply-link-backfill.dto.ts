import { ApiProperty } from '@nestjs/swagger';

const LINE_SOURCES = [
  'need_items',
  'offer_items',
  'resource_items',
  'donation_intake_lines',
  'container_lines',
] as const;

/** Un texto de línea que no casa con el catálogo (agregado por forma normalizada). */
export class UnmatchedSupplyLineGroupDto {
  @ApiProperty({ example: 'Harina PAN' })
  name!: string;

  @ApiProperty({ example: 12, description: 'Líneas sin enlazar con ese texto' })
  lines!: number;

  @ApiProperty({ enum: LINE_SOURCES, isArray: true })
  sources!: string[];

  @ApiProperty({
    example: false,
    description:
      'true = el texto casa con varios insumos activos: fusionar duplicados en vez de crear un alias',
  })
  ambiguous!: boolean;
}

/** Bloque común de no-casados de ambas respuestas del backfill. */
class SupplyLinkUnmatchedDto {
  @ApiProperty({ example: 27 })
  unmatchedLines!: number;

  @ApiProperty({ type: [UnmatchedSupplyLineGroupDto] })
  unmatched!: UnmatchedSupplyLineGroupDto[];
}

/** Informe de solo lectura del estado de enlace (`GET admin/supplies/backfill`). */
export class SupplyLinkReportDto extends SupplyLinkUnmatchedDto {
  @ApiProperty({
    example: 34,
    description: 'Textos distintos que un backfill enlazaría ahora',
  })
  pendingNames!: number;

  @ApiProperty({ example: 120 })
  pendingLines!: number;
}

/** Resultado de una ejecución del backfill (`POST admin/supplies/backfill`). */
export class SupplyLinkBackfillResultDto extends SupplyLinkUnmatchedDto {
  @ApiProperty({
    example: 34,
    description: 'Textos distintos que casaron contra el catálogo',
  })
  linkedNames!: number;

  @ApiProperty({
    example: 120,
    description:
      'Líneas realmente actualizadas en esta ejecución (0 al re-correr o si otra ejecución concurrente las enlazó antes)',
  })
  linkedLines!: number;
}
