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
  @ApiProperty({ description: 'JWT access token (auto-login after registration)' })
  accessToken!: string;
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
}
