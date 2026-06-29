import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../../domain/container-enums';
import { SupplyLineResponseDto } from './supply-line.dto';

export class CreateContainerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAL-0001', description: 'Generated trackable code' })
  code!: string;
}

export class ContainerViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAL-0001' })
  code!: string;

  @ApiProperty({ enum: ContainerType, example: ContainerType.Pallet })
  type!: ContainerType;

  @ApiProperty({ format: 'uuid' })
  emergencyId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  parentContainerId!: string | null;

  @ApiProperty({ type: [SupplyLineResponseDto] })
  lines!: SupplyLineResponseDto[];

  @ApiPropertyOptional({ example: 120, nullable: true, type: Number })
  grossWeightKg!: number | null;

  @ApiPropertyOptional({ example: 1.2, nullable: true, type: Number })
  grossVolumeM3!: number | null;

  @ApiPropertyOptional({
    enum: ContainerHolderType,
    nullable: true,
    example: ContainerHolderType.Resource,
  })
  holderType!: ContainerHolderType | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  holderId!: string | null;

  @ApiProperty({ enum: ContainerStatus, example: ContainerStatus.Open })
  status!: ContainerStatus;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class ContainerTreeViewDto extends ContainerViewDto {
  @ApiProperty({
    type: () => [ContainerTreeViewDto],
    description: 'Direct children (recursive)',
  })
  children!: ContainerTreeViewDto[];

  @ApiPropertyOptional({
    example: 145,
    nullable: true,
    type: Number,
    description: 'Aggregated weight (own + Σ children), null if none declared',
  })
  totalWeightKg!: number | null;

  @ApiPropertyOptional({
    example: 2.5,
    nullable: true,
    type: Number,
    description: 'Aggregated volume (own + Σ children), null if none declared',
  })
  totalVolumeM3!: number | null;
}
