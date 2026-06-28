import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category, OfferStatus } from '../../domain/offer-enums';

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

  @ApiProperty({ enum: Category, example: Category.Food })
  category!: Category;

  @ApiProperty({ example: 'Rice bags 25kg' })
  description!: string;

  @ApiProperty({ example: 50 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'bags', nullable: true, type: String })
  unit!: string | null;

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
}
