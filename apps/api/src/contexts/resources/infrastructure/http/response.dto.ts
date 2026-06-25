import { ApiProperty } from '@nestjs/swagger';
import { ResourceType, ResourceSide, VerificationLevel, PublicStatus } from '../../domain/resource-enums';

export class RegisterResourceResponseDto {
  @ApiProperty({ format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id!: string;
}

export class ResourceViewDto {
  @ApiProperty({ format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id!: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.CollectionPoint })
  type!: ResourceType;

  @ApiProperty({ enum: ResourceSide, example: ResourceSide.Origin })
  side!: ResourceSide;

  @ApiProperty({ example: 'Cruz Roja Madrid' })
  name!: string;

  @ApiProperty({ enum: VerificationLevel, example: VerificationLevel.Verified })
  verificationLevel!: VerificationLevel;

  @ApiProperty({ enum: PublicStatus, example: PublicStatus.Active })
  publicStatus!: PublicStatus;
}
