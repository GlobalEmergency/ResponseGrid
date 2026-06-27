import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsEmail,
  IsEnum,
  ValidateNested,
  IsLatitude,
  IsLongitude,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissingPersonStatus } from '../../domain/missing-person-status';

export class CoordsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty()
  @IsNumber()
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @IsNumber()
  @IsLongitude()
  longitude!: number;
}

export class PersonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  approximateAge?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastKnownLocation!: string;

  @ApiPropertyOptional({ type: CoordsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordsDto)
  lastKnownCoords?: CoordsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReporterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateMissingPersonReportDto {
  @ApiProperty({ type: PersonDto })
  @ValidateNested()
  @Type(() => PersonDto)
  person!: PersonDto;

  @ApiProperty({ type: ReporterDto })
  @ValidateNested()
  @Type(() => ReporterDto)
  reporter!: ReporterDto;

  @ApiProperty({ description: 'Must be true to create a report' })
  @IsBoolean()
  consentGiven!: boolean;
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: MissingPersonStatus })
  @IsEnum(MissingPersonStatus)
  status!: MissingPersonStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matchNote?: string;
}

export class RegisterSightingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiPropertyOptional({ type: CoordsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordsDto)
  coords?: CoordsDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  note!: string;
}

export class ReportListFiltersDto {
  @ApiPropertyOptional({ enum: MissingPersonStatus })
  @IsOptional()
  @IsEnum(MissingPersonStatus)
  status?: MissingPersonStatus;
}

export class DocumentIdSearchDto {
  @ApiProperty({ description: 'Document ID to search for (exact, normalized)' })
  @IsString()
  @IsNotEmpty()
  documentId!: string;
}
