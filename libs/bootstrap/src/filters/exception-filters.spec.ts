import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  DomainExceptionCode,
  parseErrorResponse,
} from '../../../common/src/exceptions';
import { GrpcExceptionFilter } from './grpc-exception.filter';
import { HttpExceptionFilter } from './http-exception.filter';

interface GrpcErrorPayload {
  code: number;
  message: string;
  details: string;
}

describe('exception filters', () => {
  const argumentsHost = {} as ArgumentsHost;

  it('normalizes an HttpException and returns only its first message', () => {
    const reply = jest.fn();
    const filter = createHttpFilter(reply);
    const exception = new BadRequestException({
      message: ['First error', 'Second error'],
    });

    filter.catch(exception, createHttpArgumentsHost());

    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      {
        code: DomainExceptionCode.BadRequest,
        message: 'First error',
        field: null,
        details: null,
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('passes through a raw numeric RpcException payload', async () => {
    const payload = {
      code: status.NOT_FOUND,
      message: 'Missing',
      details: 'wire-details',
    };
    const filter = new GrpcExceptionFilter();

    await expect(
      lastValueFrom(filter.catch(new RpcException(payload), argumentsHost)),
    ).rejects.toBe(payload);
  });

  it('returns a safe HTTP response for an unknown Error', () => {
    const reply = jest.fn();
    const filter = createHttpFilter(reply);

    filter.catch(
      new Error('database password leaked'),
      createHttpArgumentsHost(),
    );

    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        field: null,
        details: null,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('returns a safe gRPC response for an unknown Error', async () => {
    const filter = new GrpcExceptionFilter();

    const payload = await rejectedGrpcPayload(
      filter.catch(new Error('database password leaked'), argumentsHost),
    );

    expect(payload.code).toBe(status.INTERNAL);
    expect(parseErrorResponse(payload.details)).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      field: null,
      details: null,
    });
  });
});

async function rejectedGrpcPayload(
  observable: ReturnType<GrpcExceptionFilter['catch']>,
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

function createHttpFilter(reply: jest.Mock): HttpExceptionFilter {
  const adapterHost = {
    httpAdapter: { reply },
  } as unknown as HttpAdapterHost;

  return new HttpExceptionFilter(adapterHost);
}

function createHttpArgumentsHost(): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as ArgumentsHost;
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
