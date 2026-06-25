import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SlugAlreadyExistsError } from '../../application/slug-already-exists.error';

// Only catches domain errors; everything else falls through to Nest's default handler.
@Catch(SlugAlreadyExistsError)
export class EmergencyExceptionFilter implements ExceptionFilter {
  catch(exception: SlugAlreadyExistsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = HttpStatus.CONFLICT;
    response.status(statusCode).json({ statusCode, message: exception.message });
  }
}
