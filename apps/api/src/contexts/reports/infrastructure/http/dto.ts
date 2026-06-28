import {
  IsArray,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
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
