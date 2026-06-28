import {
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '../../domain/transport-capacity-enums';

export class CapacityAmountDto {
  @ApiPropertyOptional({
    example: 1500,
    description: 'Carrying weight in kilograms (positive)',
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  weightKg?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Carrying volume in cubic metres (positive)',
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  volumeM3?: number;
}

/**
 * Coverage of the offer: a discriminated object. `kind: 'corridor'` describes a
 * directed A->B route (endpoints optional: resource id and/or coordinates);
 * `kind: 'area'` is a free-text served area.
 */
export class CoverageDto {
  @ApiProperty({ enum: ['corridor', 'area'], example: 'corridor' })
  @IsIn(['corridor', 'area'])
  kind!: 'corridor' | 'area';

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Corridor: origin collection point (resource) id',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'corridor')
  @IsOptional()
  @IsUUID()
  originResourceId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Corridor: destination collection point (resource) id',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'corridor')
  @IsOptional()
  @IsUUID()
  destinationResourceId?: string;

  @ApiPropertyOptional({
    example: 10.4806,
    description: 'Corridor: origin lat',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'corridor')
  @IsOptional()
  @IsLatitude()
  originLat?: number;

  @ApiPropertyOptional({
    example: -66.9036,
    description: 'Corridor: origin lng',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'corridor')
  @IsOptional()
  @IsLongitude()
  originLng?: number;

  @ApiPropertyOptional({
    example: 10.6,
    description: 'Corridor: destination lat',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'corridor')
  @IsOptional()
  @IsLatitude()
  destinationLat?: number;

  @ApiPropertyOptional({
    example: -67.0,
    description: 'Corridor: destination lng',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'corridor')
  @IsOptional()
  @IsLongitude()
  destinationLng?: number;

  @ApiPropertyOptional({
    example: 'Estado Vargas',
    description: 'Area: free-text served area (required when kind=area)',
  })
  @ValidateIf((o: CoverageDto) => o.kind === 'area')
  @IsString()
  @IsNotEmpty()
  area?: string;
}

export class CapacityWindowDto {
  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
    description: 'Availability start (ISO-8601)',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-07-31T00:00:00.000Z',
    description: 'Availability end (ISO-8601)',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class PublishCapacityProviderDto {
  @ApiProperty({
    enum: TransportProviderType,
    example: TransportProviderType.Volunteer,
  })
  @IsEnum(TransportProviderType)
  type!: TransportProviderType;

  @ApiProperty({
    format: 'uuid',
    description: 'Volunteer or organization id (polymorphic, no FK)',
  })
  @IsUUID()
  id!: string;
}

export class PublishCapacityDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Emergency this capacity serves',
  })
  @IsUUID()
  emergencyId!: string;

  @ApiProperty({ type: PublishCapacityProviderDto })
  @ValidateNested()
  @Type(() => PublishCapacityProviderDto)
  provider!: PublishCapacityProviderDto;

  @ApiProperty({ enum: TransportMode, example: TransportMode.Road })
  @IsEnum(TransportMode)
  mode!: TransportMode;

  @ApiProperty({
    type: CapacityAmountDto,
    description: 'At least one of weightKg / volumeM3 is required',
  })
  @ValidateNested()
  @Type(() => CapacityAmountDto)
  capacity!: CapacityAmountDto;

  @ApiProperty({ type: CoverageDto })
  @ValidateNested()
  @Type(() => CoverageDto)
  coverage!: CoverageDto;

  @ApiPropertyOptional({ type: CapacityWindowDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CapacityWindowDto)
  window?: CapacityWindowDto;

  @ApiPropertyOptional({
    type: [String],
    example: ['refrigerated', 'hazmat'],
    description: 'Free-form constraints',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @ApiPropertyOptional({
    example: 'Salida diaria a las 08:00',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListCapacitiesQueryDto {
  @ApiPropertyOptional({ enum: TransportMode, description: 'Filter by mode' })
  @IsOptional()
  @IsEnum(TransportMode)
  mode?: TransportMode;

  @ApiPropertyOptional({
    enum: TransportCapacityStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(TransportCapacityStatus)
  status?: TransportCapacityStatus;

  @ApiPropertyOptional({
    example: '2026-07-05T00:00:00.000Z',
    description: 'Keep capacities available at/after this instant (ISO-8601)',
  })
  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @ApiPropertyOptional({
    example: '2026-07-10T00:00:00.000Z',
    description: 'Keep capacities available at/before this instant (ISO-8601)',
  })
  @IsOptional()
  @IsISO8601()
  availableTo?: string;
}
