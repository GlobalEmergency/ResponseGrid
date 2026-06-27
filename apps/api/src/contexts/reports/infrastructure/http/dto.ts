import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
  DamageLevel,
} from '../../domain/report-enums';

export class LocationDto {
  @ApiProperty({ example: 'Plaza España, Valencia' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 39.4699 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -0.3763 })
  @IsLongitude()
  longitude!: number;
}

export class StructuralDetailDto {
  @ApiProperty({ enum: DamageLevel })
  @IsEnum(DamageLevel)
  damageLevel!: DamageLevel;

  @ApiPropertyOptional({
    type: Number,
    description: 'Estimated number of trapped persons (null if unknown)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  trappedPersonsEstimate?: number | null;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the site is accessible for rescue teams',
  })
  @IsOptional()
  @IsBoolean()
  accessibleForRescue?: boolean | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Building type (e.g. residential, school, hospital)',
  })
  @IsOptional()
  @IsString()
  buildingType?: string | null;
}

export class SubmitReportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type!: ReportType;

  @ApiProperty({ example: 'Road blocked near bridge' })
  @IsString()
  @IsNotEmpty()
  note!: string;

  @ApiProperty({ enum: ReportPriority })
  @IsEnum(ReportPriority)
  priority!: ReportPriority;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs from POST /files (e.g. /files/key.png)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: 'Resource ID this report refers to' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({
    type: StructuralDetailDto,
    description:
      'Required for structural_damage and trapped_persons types; ignored otherwise',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StructuralDetailDto)
  structuralDetail?: StructuralDetailDto;
}

export class GetReportsQueueQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsIn(Object.values(ReportStatus))
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportPriority })
  @IsOptional()
  @IsIn(Object.values(ReportPriority))
  priority?: ReportPriority;

  @ApiPropertyOptional({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ enum: ReportType, description: 'Filter by type' })
  @IsOptional()
  @IsIn(Object.values(ReportType))
  type?: ReportType;
}

export class PublishReportDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Optional public note added by coordinator when publishing',
  })
  @IsOptional()
  @IsString()
  publishNote?: string;
}
