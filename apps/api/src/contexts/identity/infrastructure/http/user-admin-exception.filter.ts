import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { UserNotFoundError } from '../../domain/user-not-found.error';

/** Maps an unknown-user admin lookup to HTTP 404. */
@Catch(UserNotFoundError)
export class UserAdminExceptionFilter implements ExceptionFilter {
  catch(exception: UserNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.NOT_FOUND).json({
      statusCode: HttpStatus.NOT_FOUND,
      message: exception.message,
    });
  }
}
