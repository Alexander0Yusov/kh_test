import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { status } from '@grpc/grpc-js';
import { lastValueFrom, Observable } from 'rxjs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../common/src/exceptions';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { grpcErrorToDomainException } from './grpc/grpc-error.mapper';

describe('gRPC to HTTP error flow', () => {
  it('preserves a business error across the transport boundaries', async () => {
    const grpcFilter = new GrpcExceptionFilter();
    const grpcPayload = await rejectedGrpcPayload(
      grpcFilter.catch(
        new DomainException({
          code: DomainExceptionCode.EmailAlreadyExists,
          message: 'Email already exists.',
          extensions: [{ field: 'email', message: 'Email already exists.' }],
        }),
        {} as ArgumentsHost,
      ),
    );

    expect(grpcPayload.code).toBe(status.ALREADY_EXISTS);

    const gatewayException = grpcErrorToDomainException(grpcPayload);
    const reply = jest.fn();
    const httpFilter = new HttpExceptionFilter({
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost);

    httpFilter.catch(gatewayException, {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
    } as ArgumentsHost);

    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      {
        code: DomainExceptionCode.EmailAlreadyExists,
        message: 'Email already exists.',
        field: 'email',
        details: null,
      },
      HttpStatus.CONFLICT,
    );
  });
});

interface GrpcErrorPayload {
  code: number;
  message: string;
  details: string;
}

async function rejectedGrpcPayload(
  observable: Observable<never>,
): Promise<GrpcErrorPayload> {
  try {
    await lastValueFrom(observable);
    throw new Error('Expected the Observable to reject');
  } catch (error: unknown) {
    if (!isGrpcErrorPayload(error)) {
      throw error;
    }

    return error;
  }
}

function isGrpcErrorPayload(value: unknown): value is GrpcErrorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'code' in value &&
    typeof value.code === 'number' &&
    'message' in value &&
    typeof value.message === 'string' &&
    'details' in value &&
    typeof value.details === 'string'
  );
}
