import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ReportAlreadyReviewedError,
  ReportNotFoundError,
  ReportNoteRequiredError,
  ReportNotEditableError,
  ReportAlreadyClosedError,
} from '../../domain/report-errors';

type ReportDomainError =
  | ReportAlreadyReviewedError
  | ReportNotFoundError
  | ReportNoteRequiredError
  | ReportNotEditableError
  | ReportAlreadyClosedError;

@Catch(
  ReportAlreadyReviewedError,
  ReportNotFoundError,
  ReportNoteRequiredError,
  ReportNotEditableError,
  ReportAlreadyClosedError,
)
export class ReportExceptionFilter implements ExceptionFilter {
  catch(exception: ReportDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof ReportNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof ReportNoteRequiredError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.CONFLICT;

    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
