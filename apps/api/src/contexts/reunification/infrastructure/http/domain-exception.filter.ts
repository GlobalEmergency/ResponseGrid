import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConsentRequiredError,
  MissingPersonReportNotFoundError,
  SightingsClosedError,
} from '../../domain/missing-person-report-errors';
import { InvalidStatusTransitionError } from '../../domain/missing-person-status';
import { EmergencyNotAcceptingIntakeError } from '../../../emergencies/domain/emergency-not-accepting-intake.error';
import { InvalidPersonDataError } from '../../domain/person-data';
import { InvalidReporterInfoError } from '../../domain/reporter-info';

type DomainError =
  | ConsentRequiredError
  | MissingPersonReportNotFoundError
  | SightingsClosedError
  | InvalidStatusTransitionError
  | EmergencyNotAcceptingIntakeError
  | InvalidPersonDataError
  | InvalidReporterInfoError;

@Catch(
  ConsentRequiredError,
  MissingPersonReportNotFoundError,
  SightingsClosedError,
  InvalidStatusTransitionError,
  EmergencyNotAcceptingIntakeError,
  InvalidPersonDataError,
  InvalidReporterInfoError,
)
export class ReunificationDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let statusCode: number;

    if (exception instanceof MissingPersonReportNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
    } else if (exception instanceof EmergencyNotAcceptingIntakeError) {
      statusCode = HttpStatus.CONFLICT;
    } else if (
      exception instanceof ConsentRequiredError ||
      exception instanceof SightingsClosedError ||
      exception instanceof InvalidStatusTransitionError ||
      exception instanceof InvalidPersonDataError ||
      exception instanceof InvalidReporterInfoError
    ) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
