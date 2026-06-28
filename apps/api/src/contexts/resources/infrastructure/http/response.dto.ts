import { ApiProperty } from '@nestjs/swagger';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';

export class RegisterResourceResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;
}

export class LocationViewDto {
  @ApiProperty({ example: 'Calle Mayor 1, Valencia' })
  address!: string;

  @ApiProperty({ example: 39.4699 })
  latitude!: number;

  @ApiProperty({ example: -0.3763 })
  longitude!: number;
}

export class ResourceViewDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.CollectionPoint })
  type!: ResourceType;

  @ApiProperty({ enum: ResourceStage, example: ResourceStage.Origin })
  stage!: ResourceStage;

  @ApiProperty({ example: 'Cruz Roja Madrid' })
  name!: string;

  @ApiProperty({
    example: 'Centro de acopio principal',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({ type: LocationViewDto })
  location!: LocationViewDto;

  @ApiProperty({ enum: VerificationLevel, example: VerificationLevel.Verified })
  verificationLevel!: VerificationLevel;

  @ApiProperty({ enum: PublicStatus, example: PublicStatus.Active })
  publicStatus!: PublicStatus;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  ownerOrganizationId!: string | null;

  // ── enriched fields (Task 4) ──────────────────────────────────────────────

  @ApiProperty({ type: [String], example: ['water', 'food'] })
  accepts!: string[];

  @ApiProperty({ example: '+58 212 555 0000', nullable: true, type: String })
  contact!: string | null;

  @ApiProperty({ example: 'Lun-Vie 08-18', nullable: true, type: String })
  schedule!: string | null;

  @ApiProperty({ example: 'Juan Pérez', nullable: true, type: String })
  manager!: string | null;

  @ApiProperty({ example: 'acopiove.org', nullable: true, type: String })
  sourceName!: string | null;

  @ApiProperty({
    example: '2026-06-27T00:00:00.000Z',
    description: 'ISO 8601 date string',
    nullable: true,
    type: String,
  })
  externalUpdatedAt!: string | null;

  @ApiProperty({
    example: 'Venezuela',
    description:
      'Country string as stored by the ingestion source (e.g. full Spanish name "Venezuela"). ' +
      'NOT guaranteed to be an ISO 3166-1 alpha-2 code — value depends on the source `pais` field.',
    nullable: true,
    type: String,
  })
  country!: string | null;

  @ApiProperty({ example: 'Caracas', nullable: true, type: String })
  city!: string | null;
}

export class PagedResourcesDto {
  @ApiProperty({ type: [ResourceViewDto] })
  items!: ResourceViewDto[];

  @ApiProperty({ example: 123 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;
}

export class ResourceFacetsDto {
  @ApiProperty({ example: { water: 5, food: 3 } })
  byCategory!: Record<string, number>;

  @ApiProperty({
    example: { Venezuela: 3, Colombia: 2 },
    description:
      'Counts keyed by the stored `country` string. Values mirror the ingestion ' +
      'source `pais` field (full Spanish names, NOT ISO 3166-1 alpha-2 codes).',
  })
  byCountry!: Record<string, number>;

  @ApiProperty({ example: 8 })
  total!: number;
}
