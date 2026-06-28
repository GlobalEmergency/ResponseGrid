import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../../domain/container-enums';
import { SupplyLineDto } from './supply-line.dto';

export class ContainerHolderDto {
  @ApiProperty({
    enum: ContainerHolderType,
    example: ContainerHolderType.Resource,
  })
  @IsEnum(ContainerHolderType)
  type!: ContainerHolderType;

  @ApiProperty({
    format: 'uuid',
    description: 'Resource node or shipment id (polymorphic, no FK)',
  })
  @IsUUID()
  id!: string;
}

export class CreateContainerDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Emergency this container serves',
  })
  @IsUUID()
  emergencyId!: string;

  @ApiProperty({ enum: ContainerType, example: ContainerType.Pallet })
  @IsEnum(ContainerType)
  type!: ContainerType;

  @ApiPropertyOptional({
    type: [SupplyLineDto],
    description: 'Optional initial loose supply lines',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  lines?: SupplyLineDto[];

  @ApiPropertyOptional({
    example: 120,
    description: 'Declared gross weight in kg (positive)',
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  grossWeightKg?: number;

  @ApiPropertyOptional({
    example: 1.2,
    description: 'Declared gross volume in m³ (positive)',
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  grossVolumeM3?: number;

  @ApiPropertyOptional({
    type: ContainerHolderDto,
    description: 'Optional initial holder (e.g. the hub it is created at)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContainerHolderDto)
  holder?: ContainerHolderDto;
}

export class NestContainerDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'New parent container, or null to un-nest (make it top-level)',
  })
  @IsOptional()
  @IsUUID()
  parentContainerId?: string | null;
}

export class MoveContainerDto {
  @ApiPropertyOptional({
    type: ContainerHolderDto,
    nullable: true,
    description: 'New holder (resource ↔ shipment), or null to detach',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContainerHolderDto)
  holder?: ContainerHolderDto | null;
}

export class ListContainersQueryDto {
  @ApiPropertyOptional({ enum: ContainerType })
  @IsOptional()
  @IsEnum(ContainerType)
  type?: ContainerType;

  @ApiPropertyOptional({ enum: ContainerStatus })
  @IsOptional()
  @IsEnum(ContainerStatus)
  status?: ContainerStatus;

  @ApiPropertyOptional({ enum: ContainerHolderType })
  @IsOptional()
  @IsEnum(ContainerHolderType)
  holderType?: ContainerHolderType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  holderId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Only top-level containers (the roots of the trees)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  topLevelOnly?: boolean;
}
