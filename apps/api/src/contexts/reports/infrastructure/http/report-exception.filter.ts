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
  ReportNotPublishableError,
  ReportNotInReviewedStatusError,
  ReportStructuralDetailRequiredError,
} from '../../domain/report-errors';

type ReportDomainError =
  | ReportAlreadyReviewedError
  | ReportNotFoundError
  | ReportNotPublishableError
  | ReportNotInReviewedStatusError
  | ReportStructuralDetailRequiredError;

@Catch(
  ReportAlreadyReviewedError,
  ReportNotFoundError,
  ReportNotPublishableError,
  ReportNotInReviewedStatusError,
  ReportStructuralDetailRequiredError,
)
export class ReportExceptionFilter implements ExceptionFilter {
  catch(exception: ReportDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let statusCode: number;

    if (exception instanceof ReportNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
    } else if (
      exception instanceof ReportAlreadyReviewedError ||
      exception instanceof ReportNotPublishableError
    ) {
      statusCode = HttpStatus.CONFLICT;
    } else {
      // ReportNotInReviewedStatusError, ReportStructuralDetailRequiredError
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
