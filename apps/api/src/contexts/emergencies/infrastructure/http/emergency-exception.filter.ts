import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { SlugAlreadyExistsError } from '../../application/slug-already-exists.error';
import { EmergencyNotFoundError } from '../../application/emergency-not-found.error';
import { InvalidEmergencyTransitionError } from '../../domain/invalid-emergency-transition.error';

type DomainError =
  | SlugAlreadyExistsError
  | EmergencyNotFoundError
  | InvalidEmergencyTransitionError;

// Only catches domain errors; everything else falls through to Nest's default handler.
@Catch(
  SlugAlreadyExistsError,
  EmergencyNotFoundError,
  InvalidEmergencyTransitionError,
)
export class EmergencyExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof EmergencyNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof InvalidEmergencyTransitionError
          ? HttpStatus.CONFLICT
          : HttpStatus.CONFLICT; // SlugAlreadyExistsError → 409
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
