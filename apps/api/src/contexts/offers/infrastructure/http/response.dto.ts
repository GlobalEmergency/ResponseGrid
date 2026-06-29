import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '../../domain/offer-enums';
import { SupplyLineResponseDto } from '../../../supplies/infrastructure/http/supply-line.dto';
import { AuthorResponseDto } from '../../../../shared/infrastructure/http/author.dto';

export class SubmitOfferResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;
}

export class OfferLocationResponseDto {
  @ApiProperty({ example: '123 Main Street, Caracas' })
  address!: string;

  @ApiProperty({ example: 10.4806 })
  latitude!: number;

  @ApiProperty({ example: -66.9036 })
  longitude!: number;
}

export class OfferViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiProperty({ format: 'uuid' })
  donorUserId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  donorOrganizationId!: string | null;

  @ApiProperty({ type: [SupplyLineResponseDto] })
  items!: SupplyLineResponseDto[];

  @ApiProperty({ type: OfferLocationResponseDto })
  location!: OfferLocationResponseDto;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  targetNeedId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  matchedNeedId!: string | null;

  @ApiProperty({ enum: OfferStatus, example: OfferStatus.Open })
  status!: OfferStatus;

  @ApiPropertyOptional({
    example: 'Available Mon-Fri',
    nullable: true,
    type: String,
  })
  notes!: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({
    type: AuthorResponseDto,
    nullable: true,
    description:
      'Restricted contact of the real donor when filed by an integration on ' +
      'their behalf (#235). Coordinator/owner-only — never returned publicly.',
  })
  author!: AuthorResponseDto | null;
}
