import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiKeyAccessDeniedError,
  ApiKeyNotFoundError,
  ServiceAccountNotFoundError,
} from '../../domain/api-key-errors';

type ApiKeyError =
  | ApiKeyAccessDeniedError
  | ApiKeyNotFoundError
  | ServiceAccountNotFoundError;

@Catch(
  ApiKeyAccessDeniedError,
  ApiKeyNotFoundError,
  ServiceAccountNotFoundError,
)
export class ApiKeyExceptionFilter implements ExceptionFilter {
  catch(exception: ApiKeyError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof ApiKeyAccessDeniedError
        ? HttpStatus.FORBIDDEN
        : HttpStatus.NOT_FOUND;
    response
      .status(statusCode)
      .json({ statusCode, message: exception.message });
  }
}
