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
import { InvalidDisputeThresholdError } from '../../domain/invalid-dispute-threshold.error';
import { TemplateNotFoundError } from '../../../templates/application/template-not-found.error';

type DomainError =
  | SlugAlreadyExistsError
  | EmergencyNotFoundError
  | InvalidEmergencyTransitionError
  | InvalidDisputeThresholdError
  | TemplateNotFoundError;

// Only catches domain errors; everything else falls through to Nest's default handler.
@Catch(
  SlugAlreadyExistsError,
  EmergencyNotFoundError,
  InvalidEmergencyTransitionError,
  InvalidDisputeThresholdError,
  TemplateNotFoundError,
)
export class EmergencyExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof EmergencyNotFoundError ||
      exception instanceof TemplateNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof InvalidDisputeThresholdError
          ? HttpStatus.BAD_REQUEST
          : exception instanceof InvalidEmergencyTransitionError
            ? HttpStatus.CONFLICT
            : HttpStatus.CONFLICT; // SlugAlreadyExistsError → 409
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
