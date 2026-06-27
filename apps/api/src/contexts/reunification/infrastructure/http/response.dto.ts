import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordsResponseDto {
  @ApiProperty()
  address!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;
}

export class SightingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  reportedByUserId!: string | null;

  @ApiPropertyOptional()
  reportedByName!: string | null;

  @ApiProperty()
  location!: string;

  @ApiPropertyOptional({ type: CoordsResponseDto })
  coords!: CoordsResponseDto | null;

  @ApiProperty()
  note!: string;

  @ApiProperty()
  reportedAt!: Date;
}

export class PersonResponseDto {
  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  approximateAge!: number | null;

  @ApiProperty()
  lastKnownLocation!: string;

  @ApiPropertyOptional({ type: CoordsResponseDto })
  lastKnownCoords!: CoordsResponseDto | null;

  @ApiPropertyOptional()
  description!: string | null;
}

export class PersonDetailResponseDto extends PersonResponseDto {
  /** documentId is only returned to coordinators */
  @ApiPropertyOptional()
  documentId!: string | null;
}

export class CreateMissingPersonReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;
}

export class MissingPersonReportListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: PersonResponseDto })
  person!: PersonDetailResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MissingPersonReportDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  emergencyId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: PersonDetailResponseDto })
  person!: PersonDetailResponseDto;

  @ApiProperty()
  reporterName!: string;

  @ApiProperty()
  reporterPhone!: string;

  @ApiPropertyOptional()
  reporterEmail!: string | null;

  @ApiProperty({ type: [SightingResponseDto] })
  sightings!: SightingResponseDto[];

  @ApiPropertyOptional()
  matchNote!: string | null;

  @ApiPropertyOptional()
  reviewedByUserId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MyReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  emergencyId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: PersonResponseDto })
  person!: PersonResponseDto;

  @ApiProperty({ type: [SightingResponseDto] })
  sightings!: SightingResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class RegisterSightingResponseDto {
  @ApiProperty()
  sightingId!: string;
}
