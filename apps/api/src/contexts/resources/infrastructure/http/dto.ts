import {
  IsEnum,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ResourceType,
  ResourceStage,
  PublicStatus,
  VerificationLevel,
} from '../../domain/resource-enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidityReason } from '../../domain/resource-validity-report';
import { SupplyLineDto } from '../../../supplies/infrastructure/http/supply-line.dto';

export class LocationDto {
  @ApiProperty({ example: 'Calle Mayor 1, Valencia' })
  @IsString()
  @MinLength(1)
  address!: string;

  @ApiProperty({ example: 39.4699, description: 'Latitude between -90 and 90' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    example: -0.3763,
    description: 'Longitude between -180 and 180',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class RegisterResourceDto {
  @ApiProperty({ enum: ResourceType, example: ResourceType.CollectionPoint })
  @IsEnum(ResourceType)
  type!: ResourceType;

  @ApiProperty({
    enum: ResourceStage,
    example: ResourceStage.Origin,
    description: 'Stage of the resource in the emergency supply chain',
  })
  @IsEnum(ResourceStage)
  stage!: ResourceStage;

  @ApiProperty({ example: 'Cruz Roja Madrid', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Centro de acopio principal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: LocationDto,
    description: 'Physical location of the resource',
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Organization offering this resource (optional)',
  })
  @IsOptional()
  @IsString()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({
    example: '+58 212 555 0000',
    description: 'Contact info for this resource point',
  })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({
    example: 'Lun-Vie 08-18',
    description: 'Operating schedule',
  })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({
    example: 'Juan Pérez',
    description: 'Responsible manager name',
  })
  @IsOptional()
  @IsString()
  manager?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['water', 'food'],
    description: 'Category slugs this resource accepts',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepts?: string[];

  @ApiPropertyOptional({
    example: 'VE',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Caracas', description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Mark this resource as a final recipient of aid (requires the destination stage)',
  })
  @IsOptional()
  @IsBoolean()
  isFinalRecipient?: boolean;

  @ApiPropertyOptional({
    example: 'hospital',
    description:
      'Recipient type slug (see the emergency recipient-type taxonomy)',
  })
  @IsOptional()
  @IsString()
  recipientType?: string;

  @ApiPropertyOptional({
    type: [SupplyLineDto],
    description:
      'Declared inventory: the supply lines this place holds for delivery (optional)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items?: SupplyLineDto[];
}

/**
 * The coordinator only initiates verification; the actual resulting level
 * (Verified vs Official) is derived server-side from the organization's
 * accreditation status. This DTO is intentionally empty.
 */
export class VerifyResourceDto {}

export class UpdateResourcePublicStatusDto {
  @ApiProperty({
    enum: ['active', 'saturated', 'paused', 'closed'],
    example: 'saturated',
    description:
      'Target operational status. Hidden is not allowed; use close() to deactivate.',
  })
  @IsEnum(['active', 'saturated', 'paused', 'closed'])
  status!: 'active' | 'saturated' | 'paused' | 'closed';
}

export class NearbyResourcesQueryDto {
  @ApiProperty({ example: 10.4806, description: 'Latitude between -90 and 90' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    example: -66.9036,
    description: 'Longitude between -180 and 180',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({
    example: 5000,
    description: 'Search radius in meters (max 100000)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  radius!: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Max results (default 50, max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class InBoundsQueryDto {
  @ApiProperty({
    example: 10.3,
    description: 'South latitude bound (-90 to 90)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat!: number;

  @ApiProperty({
    example: -67.2,
    description: 'West longitude bound (-180 to 180)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng!: number;

  @ApiProperty({
    example: 10.7,
    description: 'North latitude bound (-90 to 90)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat!: number;

  @ApiProperty({
    example: -66.6,
    description: 'East longitude bound (-180 to 180)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng!: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Max results (default 500, max 1000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class CoordinationQueueQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ResourceType,
    description: 'Filter the queue by resource type',
    example: ResourceType.CollectionPoint,
  })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({
    description:
      'Full-text search string matched against name, address, and city (case-insensitive, max 100 chars)',
    example: 'cruz roja',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;
}

export class AdminResourcesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Restrict to one emergency. Omit for a global, cross-emergency list.',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  emergencyId?: string;

  @ApiPropertyOptional({
    enum: ResourceType,
    description: 'Filter by resource type',
    example: ResourceType.CollectionPoint,
  })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({
    enum: PublicStatus,
    description:
      'Filter by operational status (includes hidden/closed — admin only)',
    example: PublicStatus.Hidden,
  })
  @IsOptional()
  @IsEnum(PublicStatus)
  status?: PublicStatus;

  @ApiPropertyOptional({
    enum: VerificationLevel,
    description: 'Filter by verification level',
    example: VerificationLevel.Unverified,
  })
  @IsOptional()
  @IsEnum(VerificationLevel)
  verification?: VerificationLevel;

  @ApiPropertyOptional({
    description:
      'Full-text search matched against name, address and city (case-insensitive, max 100 chars)',
    example: 'cruz roja',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;
}

export class PublicResourcesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by category slug',
    example: 'water',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by ISO 3166-1 alpha-2 country code',
    example: 'VE',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description:
      'Full-text search string matched against name, address, and city (case-insensitive, max 100 chars)',
    example: 'caritas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;
}

export class DiscardResourceDto {
  @ApiProperty({
    description: 'Motivo del descarte (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Punto duplicado / fuera del ámbito de la emergencia',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class EditResourceDto {
  @ApiProperty({
    description: 'Motivo de la edición (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Se corrige el nombre y se completa el horario',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Nuevo nombre (omitir para no cambiarlo)',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Nueva descripción. Cadena vacía la borra. Omitir para no cambiarla.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Nuevo contacto. Cadena vacía lo borra. Omitir para no cambiarlo.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({
    description:
      'Nuevo horario. Cadena vacía lo borra. Omitir para no cambiarlo.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class ReportResourceValidityDto {
  @ApiProperty({
    enum: ValidityReason,
    example: ValidityReason.Closed,
    description:
      'Motivo: cerrado / ya no existe / se ha mudado / datos desactualizados',
  })
  @IsEnum(ValidityReason)
  reason!: ValidityReason;

  @ApiPropertyOptional({
    description: 'Detalle opcional aportado por el ciudadano',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs de fotos de evidencia (subidas vía /files)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class ResolveResourceDisputeDto {
  @ApiProperty({
    enum: ['confirm_closed', 'mark_invalid', 'dismiss'],
    example: 'confirm_closed',
    description:
      'confirm_closed = cerrar (reversible) · mark_invalid = marcar inválido ' +
      '(rejected, para "ya no existe") · dismiss = descartar (sigue activo)',
  })
  @IsEnum(['confirm_closed', 'mark_invalid', 'dismiss'])
  resolution!: 'confirm_closed' | 'mark_invalid' | 'dismiss';

  @ApiProperty({
    description: 'Motivo de la resolución (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Confirmado por teléfono con el responsable: el punto cerró.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}
