import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarrierType, ShipmentStatus } from '../../domain/shipment-enums';
import { SupplyLineResponseDto } from '../../../supplies/infrastructure/http/supply-line.dto';

export class CreateShipmentResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;
}

export class ShipmentViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiProperty({ format: 'uuid' })
  originResourceId!: string;

  @ApiProperty({ format: 'uuid' })
  destinationResourceId!: string;

  @ApiProperty({
    type: [SupplyLineResponseDto],
    description: 'Loose cargo lines (canonical SupplyLine, #141)',
  })
  items!: SupplyLineResponseDto[];

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Trackable containers (#140) loaded onto the expedition',
  })
  containerIds!: string[];

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  assignedCapacityId!: string | null;

  @ApiPropertyOptional({
    enum: CarrierType,
    nullable: true,
    example: CarrierType.Volunteer,
  })
  carrierType!: CarrierType | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  carrierId!: string | null;

  @ApiPropertyOptional({
    example: 'Carga frágil',
    nullable: true,
    type: String,
  })
  manifest!: string | null;

  @ApiProperty({ enum: ShipmentStatus, example: ShipmentStatus.Planned })
  status!: ShipmentStatus;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  updatedAt!: string;
}
