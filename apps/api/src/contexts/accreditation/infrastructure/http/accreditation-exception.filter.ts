import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AccreditationNotFoundError } from '../../application/revoke-accreditation';
import { AccreditationAlreadyExistsError } from '../../application/grant-accreditation';

type AccreditationError =
  | AccreditationNotFoundError
  | AccreditationAlreadyExistsError;

@Catch(AccreditationNotFoundError, AccreditationAlreadyExistsError)
export class AccreditationExceptionFilter implements ExceptionFilter {
  catch(exception: AccreditationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode =
      exception instanceof AccreditationAlreadyExistsError
        ? HttpStatus.CONFLICT
        : HttpStatus.NOT_FOUND;
    response.status(statusCode).json({
      statusCode,
      message: exception.message,
    });
  }
}
