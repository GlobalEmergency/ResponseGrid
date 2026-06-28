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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Login } from '../../application/login';
import { RegisterUser } from '../../application/register-user';
import {
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  MeResponseDto,
} from './dto';
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
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Authenticate and obtain a JWT access token' })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded — try again later',
  })
  async loginRoute(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.login.execute({ email: dto.email, password: dto.password });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: 'Register a new user account (auto-login returns JWT)',
  })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded — try again later',
  })
  async registerRoute(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({
    description: 'Authenticated user info',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  me(@Request() req: AuthedRequest): MeResponseDto {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      isAdmin: req.user.isAdmin,
      grants: req.user.grants.map((g) => ({
        roleId: g.roleId,
        scopeType: g.scope.type,
        scopeId: 'id' in g.scope ? g.scope.id : null,
        expiresAt: g.expiresAt,
      })),
    };
  }
}
