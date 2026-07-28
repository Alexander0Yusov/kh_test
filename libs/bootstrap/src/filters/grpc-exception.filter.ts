import {
  ArgumentsHost,
  Catch,
  Logger,
  RpcExceptionFilter,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import {
  DomainException,
  ErrorResponse,
  internalErrorResponse,
  serializeErrorResponse,
  toErrorResponse,
} from '../../../common/src/exceptions';
import { domainCodeToGrpcStatus } from './grpc-status.mapper';

@Catch()
export class GrpcExceptionFilter implements RpcExceptionFilter<unknown> {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    void _host;

    if (exception instanceof DomainException) {
      return this.throwGrpcError(
        domainCodeToGrpcStatus(exception.code),
        toErrorResponse(exception),
      );
    }

    if (exception instanceof RpcException) {
      const rpcError = exception.getError();

      if (this.hasNumericCode(rpcError)) {
        return throwError(() => rpcError);
      }

      this.logUnknownException(exception);
      return this.throwGrpcError(status.INTERNAL, internalErrorResponse());
    }

    this.logUnknownException(exception);
    return this.throwGrpcError(status.INTERNAL, internalErrorResponse());
  }

  private throwGrpcError(
    grpcStatus: status,
    response: ErrorResponse,
  ): Observable<never> {
    const rpcException = new RpcException({
      code: grpcStatus,
      message: response.message,
      details: serializeErrorResponse(response),
    });

    return throwError(() => rpcException.getError());
  }

  private hasNumericCode(value: string | object): value is object {
    return (
      typeof value === 'object' &&
      value !== null &&
      'code' in value &&
      typeof value.code === 'number'
    );
  }

  private logUnknownException(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      return;
    }

    this.logger.error(String(exception));
  }
}
