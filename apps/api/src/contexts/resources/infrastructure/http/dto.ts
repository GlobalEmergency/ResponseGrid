import {
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType, ResourceStage } from '../../domain/resource-enums';

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
}
