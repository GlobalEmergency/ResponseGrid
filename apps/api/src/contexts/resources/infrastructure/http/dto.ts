import { IsEnum, IsNotIn, IsString, MinLength } from 'class-validator';
import { ResourceType, ResourceSide, VerificationLevel } from '../../domain/resource-enums';

export class RegisterResourceDto {
  @IsEnum(ResourceType) type!: ResourceType;
  @IsEnum(ResourceSide) side!: ResourceSide;
  @IsString() @MinLength(2) name!: string;
}

export class VerifyResourceDto {
  @IsEnum(VerificationLevel)
  @IsNotIn([VerificationLevel.Unverified])
  level!: VerificationLevel;
}
