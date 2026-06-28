import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarrierType, ShipmentStatus } from '../../domain/shipment-enums';

export class CreateShipmentResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;
}

export class ShipmentItemResponseDto {
  @ApiProperty({ example: '5 cajas de agua' })
  description!: string;

  @ApiPropertyOptional({ example: 5, nullable: true, type: Number })
  quantity!: number | null;

  @ApiPropertyOptional({ example: 'cajas', nullable: true, type: String })
  unit!: string | null;

  @ApiPropertyOptional({
    example: 'alimentacion',
    nullable: true,
    type: String,
  })
  category!: string | null;
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

  @ApiProperty({ type: [ShipmentItemResponseDto] })
  items!: ShipmentItemResponseDto[];

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
