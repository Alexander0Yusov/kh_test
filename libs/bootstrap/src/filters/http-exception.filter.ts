import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  DomainException,
  ErrorResponse,
  internalErrorResponse,
  toErrorResponse,
} from '../../../common/src/exceptions';
import {
  domainCodeToHttpStatus,
  httpStatusToErrorCode,
} from './http-status.mapper';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<unknown>();
    const { httpAdapter } = this.httpAdapterHost;

    if (exception instanceof DomainException) {
      httpAdapter.reply(
        response,
        toErrorResponse(exception),
        domainCodeToHttpStatus(exception.code),
      );
      return;
    }

    if (exception instanceof HttpException) {
      httpAdapter.reply(
        response,
        this.fromHttpException(exception),
        exception.getStatus(),
      );
      return;
    }

    this.logUnknownException(exception);
    httpAdapter.reply(response, internalErrorResponse(), 500);
  }

  private fromHttpException(exception: HttpException): ErrorResponse {
    const response = exception.getResponse();
    const statusCode = exception.getStatus();

    if (typeof response === 'string') {
      return {
        code: httpStatusToErrorCode(statusCode),
        message: response,
        field: null,
        details: null,
      };
    }

    const body = response as Record<string, unknown>;
    const rawMessage = body.message;

    return {
      code:
        typeof body.code === 'string'
          ? body.code
          : httpStatusToErrorCode(statusCode),
      message: this.firstMessage(rawMessage, exception.message),
      field: typeof body.field === 'string' ? body.field : null,
      details: Object.hasOwn(body, 'details') ? (body.details ?? null) : null,
    };
  }

  private firstMessage(value: unknown, fallback: string): string {
    if (Array.isArray(value)) {
      const firstMessage: unknown = value[0];
      return typeof firstMessage === 'string' ? firstMessage : fallback;
    }

    return typeof value === 'string' ? value : fallback;
  }

  private logUnknownException(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      return;
    }

    this.logger.error(String(exception));
  }
}
