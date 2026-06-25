import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { InvalidCredentialsError } from '../../domain/invalid-credentials.error';

@Catch(InvalidCredentialsError)
export class IdentityExceptionFilter implements ExceptionFilter {
  catch(exception: InvalidCredentialsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .status(HttpStatus.UNAUTHORIZED)
      .json({ statusCode: HttpStatus.UNAUTHORIZED, message: exception.message });
  }
}
