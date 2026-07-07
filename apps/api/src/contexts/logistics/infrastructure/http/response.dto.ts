import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '@globalemergency/warehouse-core/logistics';

export class PublishCapacityResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;
}

export class CapacityAmountResponseDto {
  @ApiPropertyOptional({ example: 1500, nullable: true, type: Number })
  weightKg!: number | null;

  @ApiPropertyOptional({ example: 12, nullable: true, type: Number })
  volumeM3!: number | null;
}

export class CoverageResponseDto {
  @ApiProperty({ enum: ['corridor', 'area'], example: 'corridor' })
  kind!: 'corridor' | 'area';

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  originResourceId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  destinationResourceId?: string | null;

  @ApiPropertyOptional({ example: 10.4806, nullable: true, type: Number })
  originLat?: number | null;

  @ApiPropertyOptional({ example: -66.9036, nullable: true, type: Number })
  originLng?: number | null;

  @ApiPropertyOptional({ example: 10.6, nullable: true, type: Number })
  destinationLat?: number | null;

  @ApiPropertyOptional({ example: -67.0, nullable: true, type: Number })
  destinationLng?: number | null;

  @ApiPropertyOptional({ example: 'Estado Vargas', type: String })
  area?: string;
}

export class CapacityWindowResponseDto {
  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
    nullable: true,
    type: String,
  })
  from!: string | null;

  @ApiPropertyOptional({
    example: '2026-07-31T00:00:00.000Z',
    nullable: true,
    type: String,
  })
  to!: string | null;
}

export class CapacityViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiProperty({
    enum: TransportProviderType,
    example: TransportProviderType.Volunteer,
  })
  providerType!: TransportProviderType;

  @ApiProperty({ format: 'uuid' })
  providerId!: string;

  @ApiProperty({ enum: TransportMode, example: TransportMode.Road })
  mode!: TransportMode;

  @ApiProperty({ type: CapacityAmountResponseDto })
  capacity!: CapacityAmountResponseDto;

  @ApiProperty({ type: CoverageResponseDto })
  coverage!: CoverageResponseDto;

  @ApiProperty({ type: CapacityWindowResponseDto })
  window!: CapacityWindowResponseDto;

  @ApiProperty({ type: [String], example: ['refrigerated'] })
  constraints!: string[];

  @ApiProperty({
    enum: TransportCapacityStatus,
    example: TransportCapacityStatus.Available,
  })
  status!: TransportCapacityStatus;

  @ApiPropertyOptional({
    example: 'Salida diaria a las 08:00',
    nullable: true,
    type: String,
  })
  notes!: string | null;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  updatedAt!: string;
}
