import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Batafsil log
    const logMessage = `${request.method} ${request.url} ${statusCode} — ${message}`;

    if (statusCode >= 500) {
      this.logger.error(logMessage);
      if (exception instanceof Error) {
        this.logger.error(`Stack: ${exception.stack}`);
      }
      // Unknown xatolar uchun to'liq ob'yekt
      if (!(exception instanceof HttpException)) {
        this.logger.error(`Full error: ${JSON.stringify(exception, Object.getOwnPropertyNames(exception as object), 2)}`);
      }
    } else if (statusCode >= 400) {
      this.logger.warn(logMessage);
    }

    response.status(statusCode).json({
      success: false,
      message,
      statusCode,
    });
  }
}
