import { HttpStatus } from '@nestjs/common';
import { DomainExceptionCode } from '../../../common/src/exceptions';
import {
  domainCodeToHttpStatus,
  httpStatusToErrorCode,
} from './http-status.mapper';

describe('HTTP status mapper', () => {
  it.each([
    [DomainExceptionCode.BadRequest, HttpStatus.BAD_REQUEST],
    [DomainExceptionCode.ValidationFailed, HttpStatus.BAD_REQUEST],
    [DomainExceptionCode.Unauthorized, HttpStatus.UNAUTHORIZED],
    [DomainExceptionCode.Forbidden, HttpStatus.FORBIDDEN],
    [DomainExceptionCode.NotFound, HttpStatus.NOT_FOUND],
    [DomainExceptionCode.AlreadyExists, HttpStatus.CONFLICT],
    [DomainExceptionCode.EmailAlreadyExists, HttpStatus.CONFLICT],
    [DomainExceptionCode.Conflict, HttpStatus.CONFLICT],
    [DomainExceptionCode.InvalidBusinessState, HttpStatus.CONFLICT],
    [DomainExceptionCode.PayloadTooLarge, HttpStatus.PAYLOAD_TOO_LARGE],
    [
      DomainExceptionCode.UnsupportedMediaType,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    ],
    [DomainExceptionCode.TooManyRequests, HttpStatus.TOO_MANY_REQUESTS],
    [DomainExceptionCode.ServiceUnavailable, HttpStatus.SERVICE_UNAVAILABLE],
    [DomainExceptionCode.GatewayTimeout, HttpStatus.GATEWAY_TIMEOUT],
  ])('maps %s to %s', (code, expectedStatus) => {
    expect(domainCodeToHttpStatus(code)).toBe(expectedStatus);
  });

  it.each([
    [HttpStatus.BAD_REQUEST, DomainExceptionCode.BadRequest],
    [HttpStatus.UNAUTHORIZED, DomainExceptionCode.Unauthorized],
    [HttpStatus.FORBIDDEN, DomainExceptionCode.Forbidden],
    [HttpStatus.NOT_FOUND, DomainExceptionCode.NotFound],
    [HttpStatus.CONFLICT, DomainExceptionCode.Conflict],
    [HttpStatus.PAYLOAD_TOO_LARGE, DomainExceptionCode.PayloadTooLarge],
    [
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      DomainExceptionCode.UnsupportedMediaType,
    ],
    [HttpStatus.TOO_MANY_REQUESTS, DomainExceptionCode.TooManyRequests],
    [HttpStatus.SERVICE_UNAVAILABLE, DomainExceptionCode.ServiceUnavailable],
    [HttpStatus.GATEWAY_TIMEOUT, DomainExceptionCode.GatewayTimeout],
    [HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR'],
    [HttpStatus.I_AM_A_TEAPOT, DomainExceptionCode.BadRequest],
  ])('maps HTTP %s to %s', (statusCode, expectedCode) => {
    expect(httpStatusToErrorCode(statusCode)).toBe(expectedCode);
  });
});
