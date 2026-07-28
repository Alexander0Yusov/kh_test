import { DomainException } from './domain-exception';
import { DomainExceptionCode } from './domain-exception-code';
import {
  parseErrorResponse,
  serializeErrorResponse,
  toErrorResponse,
} from './error-response';

describe('ErrorResponse', () => {
  it('maps a DomainException without extensions', () => {
    const exception = new DomainException({
      code: DomainExceptionCode.NotFound,
      message: 'Post not found',
    });

    expect(toErrorResponse(exception)).toEqual({
      code: DomainExceptionCode.NotFound,
      message: 'Post not found',
      field: null,
      details: null,
    });
  });

  it('uses only the first extension', () => {
    const exception = new DomainException({
      code: DomainExceptionCode.ValidationFailed,
      message: 'Validation failed',
      extensions: [
        { field: 'email', message: 'Email is invalid' },
        { field: 'name', message: 'Name is invalid' },
      ],
    });

    expect(toErrorResponse(exception)).toEqual({
      code: DomainExceptionCode.ValidationFailed,
      message: 'Email is invalid',
      field: 'email',
      details: null,
    });
  });

  it('serializes and parses all ErrorResponse fields', () => {
    const response = {
      code: DomainExceptionCode.EmailAlreadyExists,
      message: 'Email already exists.',
      field: 'email',
      details: { retryable: false },
    };

    expect(parseErrorResponse(serializeErrorResponse(response))).toEqual(
      response,
    );
  });

  it.each([
    '',
    'not-json',
    '{}',
    '{"code":"NOT_FOUND","message":"Missing","field":42,"details":null}',
    '{"code":"NOT_FOUND","message":"Missing","field":null}',
  ])('returns null for malformed details: %s', (details) => {
    expect(parseErrorResponse(details)).toBeNull();
  });
});
