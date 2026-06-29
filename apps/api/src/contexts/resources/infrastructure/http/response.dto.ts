import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';
import { AuthorResponseDto } from '../../../../shared/infrastructure/http/author.dto';
import {
  ValidityReason,
  ValidityReportStatus,
} from '../../domain/resource-validity-report';

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

  // ── destinatario final (#60) ──────────────────────────────────────────────

  @ApiProperty({
    example: false,
    description: 'Whether this resource is a final recipient of aid',
  })
  isFinalRecipient!: boolean;

  @ApiProperty({
    example: 'hospital',
    nullable: true,
    type: String,
    description:
      'Recipient type slug (see the emergency recipient-type taxonomy)',
  })
  recipientType!: string | null;

  // ── validez reportada por ciudadanos (ficha 15) ───────────────────────────

  @ApiProperty({
    example: false,
    description:
      'Whether enough citizens have reported this point as invalid; it stays ' +
      'visible with an "in review" warning until a coordinator resolves it.',
  })
  disputed!: boolean;

  @ApiProperty({
    example: '2026-06-28T12:00:00.000Z',
    nullable: true,
    type: String,
    description: 'When the point was flagged as disputed (ISO 8601), or null',
  })
  disputedAt!: string | null;
}

/**
 * Detail view returned by the single-resource endpoint: the base view plus an
 * AGGREGATED inventory — only the distinct categories the place holds, never
 * names or quantities (privacy: the endpoint is public/anonymous; see
 * ResourceDetailView). List/map endpoints return ResourceViewDto.
 */
export class ResourceDetailViewDto extends ResourceViewDto {
  @ApiProperty({
    type: [String],
    example: ['water', 'hygiene'],
    description: 'Distinct categories of material this place has declared',
  })
  inventoryCategories!: string[];
}

export class NearbyResourceViewDto extends ResourceViewDto {
  @ApiProperty({
    example: 1234,
    description: 'Distance from query point in meters (rounded)',
  })
  distanceMeters!: number;
}

export class NearbyResourcesResponseDto {
  @ApiProperty({ type: [NearbyResourceViewDto] })
  items!: NearbyResourceViewDto[];
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

export class InBoundsResourcesDto {
  @ApiProperty({ type: [ResourceViewDto] })
  items!: ResourceViewDto[];
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

export class ReportResourceValidityResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiProperty({
    example: false,
    description:
      'Whether this report pushed the resource over the threshold to disputed',
  })
  disputed!: boolean;
}

export class ValidityReportDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiProperty({ format: 'uuid' })
  reporterUserId!: string;

  @ApiProperty({ enum: ValidityReason, example: ValidityReason.Closed })
  reason!: ValidityReason;

  @ApiProperty({ nullable: true, type: String })
  note!: string | null;

  @ApiProperty({ type: [String] })
  photoUrls!: string[];

  @ApiProperty({
    enum: ValidityReportStatus,
    example: ValidityReportStatus.Open,
  })
  status!: ValidityReportStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  resolvedByUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  resolvedAt!: string | null;
}

/**
 * Admin list row (#177): the base resource view plus the owning emergency
 * (id + resolved name), so the platform-admin console — which is cross-emergency
 * — can label and group rows. Reuses ResourceViewDto rather than a parallel
 * shape.
 */
export class ResourceAdminViewDto extends ResourceViewDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Emergency this resource belongs to',
  })
  emergencyId!: string;

  @ApiProperty({
    example: 'Terremoto Venezuela 2026',
    nullable: true,
    type: String,
    description: 'Resolved emergency name, or null when it could not be found',
  })
  emergencyName!: string | null;

  @ApiPropertyOptional({
    type: AuthorResponseDto,
    nullable: true,
    description:
      'Restricted contact of the real registrant when filed by an integration ' +
      'on their behalf (#235). Platform-admin only — never returned publicly.',
  })
  author!: AuthorResponseDto | null;
}

export class PagedAdminResourcesDto {
  @ApiProperty({ type: [ResourceAdminViewDto] })
  items!: ResourceAdminViewDto[];

  @ApiProperty({ example: 123 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;
}

/**
 * Admin detail (#177): the admin view + the aggregated declared inventory
 * (distinct categories) + every citizen validity report (open + resolved).
 * Works for a resource of ANY status — the platform admin can inspect it whether
 * or not it is published.
 */
export class ResourceAdminDetailDto extends ResourceAdminViewDto {
  @ApiProperty({
    type: [String],
    example: ['water', 'hygiene'],
    description: 'Distinct categories of material this place has declared',
  })
  inventoryCategories!: string[];

  @ApiProperty({
    type: [ValidityReportDto],
    description: 'Citizen validity reports for this resource (open + resolved)',
  })
  validityReports!: ValidityReportDto[];
}

export class DisputedResourceDto {
  @ApiProperty({ type: ResourceViewDto })
  resource!: ResourceViewDto;

  @ApiProperty({
    example: 3,
    description: 'Distinct citizens with an open report on this resource',
  })
  distinctReporters!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { closed: 2, moved: 1 },
    description: 'Open-report counts keyed by reason',
  })
  byReason!: Record<string, number>;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastReportedAt!: string | null;
}
