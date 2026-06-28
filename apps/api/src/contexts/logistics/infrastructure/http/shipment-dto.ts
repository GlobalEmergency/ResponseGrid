import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarrierType, ShipmentStatus } from '../../domain/shipment-enums';
import { Category } from '../../../supplies/domain/category';

export class ShipmentItemDto {
  @ApiProperty({ example: '5 cajas de agua', description: 'What moves' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'How much (positive). Optional — cargo is often loose.',
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional({ example: 'cajas', nullable: true, type: String })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    enum: Category,
    example: Category.Food,
    description: 'Shared category taxonomy (optional — cargo may be loose)',
  })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;
}

export class CreateShipmentDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Emergency this shipment serves',
  })
  @IsUUID()
  emergencyId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Origin resource node (collection point) id',
  })
  @IsUUID()
  originResourceId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Destination resource node id',
  })
  @IsUUID()
  destinationResourceId!: string;

  @ApiProperty({
    type: [ShipmentItemDto],
    description: 'Cargo manifest lines (at least one)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items!: ShipmentItemDto[];

  @ApiPropertyOptional({
    example: 'Carga frágil, manipular con cuidado',
    description: 'Free-text cargo manifest note',
  })
  @IsOptional()
  @IsString()
  manifest?: string;
}

export class AssignShipmentCarrierDto {
  @ApiProperty({ enum: CarrierType, example: CarrierType.Volunteer })
  @IsEnum(CarrierType)
  type!: CarrierType;

  @ApiProperty({
    format: 'uuid',
    description: 'Volunteer or organization id (polymorphic, no FK)',
  })
  @IsUUID()
  id!: string;
}

export class AssignCapacityToShipmentDto {
  @ApiProperty({
    format: 'uuid',
    description: 'TransportCapacity (#105) to earmark for this shipment',
  })
  @IsUUID()
  assignedCapacityId!: string;

  @ApiPropertyOptional({
    type: AssignShipmentCarrierDto,
    description:
      'Optional carrier. Omit for an internal inventory transfer (no carrier).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignShipmentCarrierDto)
  carrier?: AssignShipmentCarrierDto;
}

export class ListShipmentsQueryDto {
  @ApiPropertyOptional({
    enum: ShipmentStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}

export class MyShipmentsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional emergency scope; omit to list across emergencies',
  })
  @IsOptional()
  @IsUUID()
  emergencyId?: string;
}
