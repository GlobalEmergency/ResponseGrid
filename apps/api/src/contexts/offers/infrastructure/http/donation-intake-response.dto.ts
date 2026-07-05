import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplyLineResponseDto } from '../../../supplies/infrastructure/http/supply-line.dto';
import { DonationIntakeStatus } from '../../domain/donation-intake-enums';

export class CreateDonationIntakeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty({
    enum: DonationIntakeStatus,
    example: DonationIntakeStatus.Pending,
  })
  status!: string;
}

export class PendingIntakeSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 2 })
  itemCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class IntakeDeepLinkDto {
  @ApiProperty({
    example:
      'http://localhost:3001/e/mexico-demo/pre-registro?resourceId=33333333-3333-4333-8333-333333333331',
  })
  url!: string;

  @ApiProperty({ example: 'Acopio CDMX Norte' })
  resourceName!: string;

  @ApiProperty({ example: 'mexico-demo' })
  slug!: string;

  @ApiProperty({ format: 'uuid' })
  resourceId!: string;
}

export class LookupDonorByContactResponseDto {
  @ApiPropertyOptional({ example: 'María López', nullable: true, type: String })
  donorName!: string | null;

  @ApiProperty({ type: [PendingIntakeSummaryDto] })
  pendingIntakes!: PendingIntakeSummaryDto[];
}

export class IntakeLineViewDto extends SupplyLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sortOrder!: number;
}

export class DonationIntakeViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiProperty({ format: 'uuid' })
  targetResourceId!: string;

  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty({ enum: DonationIntakeStatus })
  status!: string;

  @ApiProperty()
  donorName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  donorPhone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  donorEmail!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  donorUserId!: string | null;

  @ApiProperty({ type: [IntakeLineViewDto] })
  lines!: IntakeLineViewDto[];

  @ApiPropertyOptional({ nullable: true, type: String })
  volunteerNotes!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  evidenceFileKey!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Reason recorded when received lines differed from declared',
  })
  receptionAdjustmentReason!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  receivedByUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/**
 * Public-safe projection returned by the anonymous PATCH /donation-intakes/:id.
 *
 * The caller proved ownership (code + contact) so we echo back their OWN
 * submitted data + status, but we deliberately DROP the coordinator-only,
 * internal fields that the donor never supplied: `donorUserId`,
 * `receivedByUserId`, `evidenceFileKey`, `volunteerNotes` and
 * `receptionAdjustmentReason`.
 */
export class PublicDonationIntakeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiProperty({ format: 'uuid' })
  targetResourceId!: string;

  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty({ enum: DonationIntakeStatus })
  status!: string;

  @ApiProperty()
  donorName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  donorPhone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  donorEmail!: string | null;

  @ApiProperty({ type: [IntakeLineViewDto] })
  lines!: IntakeLineViewDto[];

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/**
 * Map the full (coordinator) intake view to the public-safe projection,
 * stripping internal fields. Keep this in the DTO module so the whitelist of
 * exposed fields lives next to the DTO definition.
 */
export function toPublicDonationIntakeDto(
  view: DonationIntakeViewDto,
): PublicDonationIntakeDto {
  return {
    id: view.id,
    emergencyId: view.emergencyId,
    targetResourceId: view.targetResourceId,
    intakeCode: view.intakeCode,
    status: view.status,
    donorName: view.donorName,
    donorPhone: view.donorPhone,
    donorEmail: view.donorEmail,
    lines: view.lines,
    receivedAt: view.receivedAt,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

export class DonationIntakeSearchHitDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty()
  donorName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  donorPhone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  donorEmail!: string | null;

  @ApiProperty({ enum: DonationIntakeStatus })
  status!: string;

  @ApiProperty({ format: 'uuid' })
  targetResourceId!: string;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

/** Public donor tracking view (#168) — no third-party PII. */
export class DonationIntakeTrackingDto {
  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty({ enum: DonationIntakeStatus })
  status!: string;

  @ApiPropertyOptional({
    example: 'Acopio CDMX Norte',
    nullable: true,
    type: String,
  })
  resourceName!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: [SupplyLineResponseDto] })
  lines!: SupplyLineResponseDto[];
}

/** One aggregated line of expected incoming material for a point (#200 forecast). */
export class IncomingSummaryLineDto {
  @ApiProperty({ example: 'Agua embotellada' })
  name!: string;

  @ApiProperty({ example: 'water' })
  category!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  unit!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  presentation!: string | null;

  @ApiProperty({
    description: 'Total expected across all pending intakes for this line',
    example: 200,
  })
  totalQuantity!: number;

  @ApiProperty({
    description: 'Distinct pending intakes contributing to this line',
    example: 3,
  })
  intakeCount!: number;
}

/** Forecast of incoming material for a collection point (pending intakes). */
export class IncomingSummaryDto {
  @ApiProperty({ type: [IncomingSummaryLineDto] })
  lines!: IncomingSummaryLineDto[];

  @ApiProperty({ example: 5 })
  totalPendingIntakes!: number;
}

/** One of the authenticated donor's own donations (#168, platform-level list). */
export class MyDonationIntakeDto {
  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty({ enum: DonationIntakeStatus })
  status!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiPropertyOptional({
    example: 'terremoto-venezuela-2026',
    nullable: true,
    type: String,
  })
  emergencySlug!: string | null;

  @ApiPropertyOptional({
    example: 'Acopio CDMX Norte',
    nullable: true,
    type: String,
  })
  resourceName!: string | null;

  @ApiProperty({ example: 3 })
  itemCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;
}
