import { status } from '@grpc/grpc-js';
import {
  DomainExceptionCode,
  serializeErrorResponse,
} from '../../../common/src/exceptions';
import { grpcErrorToDomainException } from './grpc-error.mapper';

describe('grpcErrorToDomainException', () => {
  it('restores the business code and field from details', () => {
    const exception = grpcErrorToDomainException({
      code: status.ALREADY_EXISTS,
      details: serializeErrorResponse({
        code: DomainExceptionCode.EmailAlreadyExists,
        message: 'Email already exists.',
        field: 'email',
        details: null,
      }),
    });

    expect(exception).toMatchObject({
      code: DomainExceptionCode.EmailAlreadyExists,
      message: 'Email already exists.',
      extensions: [
        {
          field: 'email',
          message: 'Email already exists.',
        },
      ],
    });
  });

  it.each(['', 'not-json', '{"code":42}'])(
    'falls back to the numeric gRPC status for malformed details: %s',
    (details) => {
      const exception = grpcErrorToDomainException({
        code: status.NOT_FOUND,
        details,
      });

      expect(exception).toMatchObject({
        code: DomainExceptionCode.NotFound,
        message: 'Dependent service request failed',
        extensions: [],
      });
    },
  );
});
