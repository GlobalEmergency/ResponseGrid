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
} from '../../domain/report-errors';

type ReportDomainError = ReportAlreadyReviewedError | ReportNotFoundError;

@Catch(ReportAlreadyReviewedError, ReportNotFoundError)
export class ReportExceptionFilter implements ExceptionFilter {
  catch(exception: ReportDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof ReportNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;

    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
