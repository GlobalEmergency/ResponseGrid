import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
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

  @ApiProperty({
    example: '+58 412 555 0101',
    type: String,
    description: 'Teléfono de contacto (obligatorio)',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    example: true,
    description: 'Aceptación de las condiciones del servicio (debe ser true)',
  })
  @IsBoolean()
  @Equals(true)
  acceptedTerms!: boolean;

  @ApiProperty({
    example: true,
    description: 'Aceptación de la política de privacidad (debe ser true)',
  })
  @IsBoolean()
  @Equals(true)
  acceptedPrivacy!: boolean;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'JWT access token (auto-login after registration)',
  })
  accessToken!: string;
}

export class OnboardingDto {
  @ApiProperty({
    example: '+58 412 555 0101',
    type: String,
    description: 'Teléfono de contacto (obligatorio)',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    example: true,
    description: 'Aceptación de las condiciones del servicio (debe ser true)',
  })
  @IsBoolean()
  @Equals(true)
  acceptedTerms!: boolean;

  @ApiProperty({
    example: true,
    description: 'Aceptación de la política de privacidad (debe ser true)',
  })
  @IsBoolean()
  @Equals(true)
  acceptedPrivacy!: boolean;
}

export class OnboardingResponseDto {
  @ApiProperty({
    description:
      'true una vez el perfil queda completo (teléfono + consentimientos)',
  })
  profileComplete!: boolean;
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
    example: '+58 412 555 0101',
    nullable: true,
    type: String,
    description: 'Optional contact phone, null until the user provides one',
  })
  phone!: string | null;

  @ApiProperty({
    description:
      'true si el perfil está completo (teléfono + consentimientos vigentes). ' +
      'false obliga a pasar por el onboarding (típico en altas sociales).',
  })
  profileComplete!: boolean;

  @ApiProperty({
    type: [MeGrantDto],
    description: 'The effective role grants (role @ scope) for this user',
  })
  grants!: MeGrantDto[];
}

export class UpdateProfileDto {
  @ApiProperty({
    example: '+58 412 555 0101',
    required: false,
    nullable: true,
    type: String,
    description: 'Nuevo teléfono. null para borrar.',
  })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiProperty({ example: 'Nuevo Nombre', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
