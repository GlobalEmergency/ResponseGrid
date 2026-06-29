import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarrierType, ShipmentStatus } from '../../domain/shipment-enums';
import { SupplyLineDto } from '../../../supplies/infrastructure/http/supply-line.dto';

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

  @ApiPropertyOptional({
    type: [SupplyLineDto],
    description:
      'Loose cargo lines (canonical SupplyLine). Optional when containers are loaded — a shipment must carry at least lines or containers.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items?: SupplyLineDto[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Trackable containers (#140) loaded onto the expedition. Optional when loose lines are provided.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  containerIds?: string[];

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
