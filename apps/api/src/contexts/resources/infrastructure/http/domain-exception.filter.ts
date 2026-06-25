import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ResourceNotFoundError } from '../../application/resource-not-found.error';
import { ResourceNotVerifiedError, InvalidVerificationLevelError } from '../../domain/resource-errors';

type DomainError = ResourceNotFoundError | ResourceNotVerifiedError | InvalidVerificationLevelError;

// Only catches domain errors; everything else (e.g. ValidationPipe's BadRequestException)
// falls through to Nest's default handler, which already returns clean JSON.
@Catch(ResourceNotFoundError, ResourceNotVerifiedError, InvalidVerificationLevelError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof ResourceNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof ResourceNotVerifiedError
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST;
    response.status(statusCode).json({ statusCode, message: exception.message });
  }
}
