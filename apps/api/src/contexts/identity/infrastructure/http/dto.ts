import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@reliefhub.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin1234', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@reliefhub.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name!: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'JWT access token (auto-login after registration)',
  })
  accessToken!: string;
}

export class MeGrantDto {
  @ApiProperty({
    description: 'Role id from the catalog',
    example: 'org_admin',
  })
  roleId!: string;

  @ApiProperty({
    enum: ['platform', 'organization', 'emergency', 'group', 'entity'],
  })
  scopeType!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Scope id (null for platform)',
  })
  scopeId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'ISO expiry, or null',
  })
  expiresAt!: string | null;
}

export class MeResponseDto {
  @ApiProperty({ description: 'User UUID' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty({
    type: [MeGrantDto],
    description: 'The effective role grants (role @ scope) for this user',
  })
  grants!: MeGrantDto[];
}
