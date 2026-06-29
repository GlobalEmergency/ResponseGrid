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

  @ApiProperty({ example: 'ACO-7F3K' })
  intakeCode!: string;

  @ApiProperty({ format: 'uuid' })
  targetResourceId!: string;

  @ApiProperty({ example: 2 })
  itemCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class IntakeDeepLinkDto {
  @ApiProperty({
    example:
      'http://localhost:3001/e/mexico-demo/donar-acopio?resourceId=33333333-3333-4333-8333-333333333331',
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

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  receivedByUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
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
