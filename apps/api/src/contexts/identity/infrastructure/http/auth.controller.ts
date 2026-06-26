import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Login } from '../../application/login';
import { RegisterUser } from '../../application/register-user';
import { LoginDto, LoginResponseDto, RegisterDto, RegisterResponseDto, MeResponseDto } from './dto';
import { IdentityExceptionFilter } from './identity-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';

type AuthedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('auth')
@Controller('auth')
@UseFilters(IdentityExceptionFilter)
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly registerUser: RegisterUser,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and obtain a JWT access token' })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async loginRoute(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.login.execute({ email: dto.email, password: dto.password });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account (auto-login returns JWT)' })
  @ApiCreatedResponse({ description: 'User registered successfully', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Email already registered' })
  async registerRoute(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.registerUser.execute({ email: dto.email, password: dto.password, name: dto.name });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ description: 'Authenticated user info', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  me(@Request() req: AuthedRequest): MeResponseDto {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      isAdmin: req.user.isAdmin,
    };
  }
}
