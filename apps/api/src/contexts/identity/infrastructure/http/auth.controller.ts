import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import type { Request as ExpressRequest } from 'express';
import { Login } from '../../application/login';
import { RegisterUser } from '../../application/register-user';
import { CompleteRegistration } from '../../application/complete-registration';
import {
  UpdateProfile,
  UpdateProfileResult,
} from '../../application/update-profile';
import {
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  MeResponseDto,
  UpdateProfileDto,
  OnboardingDto,
  OnboardingResponseDto,
} from './dto';
import { IdentityExceptionFilter } from './identity-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';
import { CONSENT_REPOSITORY } from '../../domain/ports/consent.repository';
import type { ConsentRepository } from '../../domain/ports/consent.repository';
import { UserId } from '../../domain/user-id';
import { isProfileComplete } from '../../domain/consent';

type AuthedRequest = ExpressRequest & { user: AuthenticatedUser };

/** Extracts the audit context (IP + User-Agent) stored with a consent record. */
function consentContext(req: ExpressRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  return {
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}

@ApiTags('auth')
@Controller('auth')
@UseFilters(IdentityExceptionFilter)
export class AuthController {
  constructor(
    private readonly login: Login,
    private readonly registerUser: RegisterUser,
    private readonly updateProfile: UpdateProfile,
    private readonly completeRegistration: CompleteRegistration,
    @Inject(CONSENT_REPOSITORY)
    private readonly consentRepo: ConsentRepository,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
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
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
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
  async registerRoute(
    @Request() req: ExpressRequest,
    @Body() dto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      phone: dto.phone,
      acceptedTerms: dto.acceptedTerms,
      acceptedPrivacy: dto.acceptedPrivacy,
      ...consentContext(req),
    });
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Completar el alta: teléfono + aceptación de términos y privacidad ' +
      '(usado tras el login social)',
  })
  @ApiOkResponse({
    description: 'Perfil completado',
    type: OnboardingResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Falta el teléfono o el consentimiento',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  async onboardingRoute(
    @Request() req: AuthedRequest,
    @Body() dto: OnboardingDto,
  ): Promise<OnboardingResponseDto> {
    return this.completeRegistration.execute({
      userId: req.user.id,
      phone: dto.phone,
      acceptedTerms: dto.acceptedTerms,
      acceptedPrivacy: dto.acceptedPrivacy,
      ...consentContext(req),
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
  async me(@Request() req: AuthedRequest): Promise<MeResponseDto> {
    const consents = await this.consentRepo.findByUser(
      UserId.fromString(req.user.id),
    );
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      isAdmin: req.user.isAdmin,
      phone: req.user.phone,
      profileComplete: isProfileComplete(req.user.phone, consents),
      grants: req.user.grants.map((g) => ({
        roleId: g.roleId,
        scopeType: g.scope.type,
        scopeId: 'id' in g.scope ? g.scope.id : null,
        expiresAt: g.expiresAt,
      })),
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar teléfono y/o nombre del perfil autenticado',
  })
  @ApiOkResponse({ description: 'Perfil actualizado', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  async updateMe(
    @Request() req: AuthedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UpdateProfileResult> {
    return this.updateProfile.execute({
      userId: req.user.id,
      phone: dto.phone,
      name: dto.name,
    });
  }
}
