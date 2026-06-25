import { IsEnum, IsNotIn, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResourceType, ResourceSide, VerificationLevel } from '../../domain/resource-enums';

export class RegisterResourceDto {
  @ApiProperty({ enum: ResourceType, example: ResourceType.CollectionPoint })
  @IsEnum(ResourceType)
  type!: ResourceType;

  @ApiProperty({ enum: ResourceSide, example: ResourceSide.Origin })
  @IsEnum(ResourceSide)
  side!: ResourceSide;

  @ApiProperty({ example: 'Cruz Roja Madrid', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;
}

export class VerifyResourceDto {
  @ApiProperty({
    enum: VerificationLevel,
    example: VerificationLevel.Verified,
    description: 'Must not be "unverified"',
  })
  @IsEnum(VerificationLevel)
  @IsNotIn([VerificationLevel.Unverified])
  level!: VerificationLevel;
}
