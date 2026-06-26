import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { NeedNotFoundError } from '../../application/need-not-found.error';
import { NeedNotPendingError } from '../../domain/need-errors';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';

type DomainError =
  | NeedNotFoundError
  | NeedNotPendingError
  | EmergencyNotAcceptingIntakeError;

// Only catches domain errors from the needs context; everything else falls through
// to Nest's default handler.
@Catch(NeedNotFoundError, NeedNotPendingError, EmergencyNotAcceptingIntakeError)
export class NeedsDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof NeedNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof EmergencyNotAcceptingIntakeError
          ? HttpStatus.CONFLICT
          : HttpStatus.CONFLICT;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
