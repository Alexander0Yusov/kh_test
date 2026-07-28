import { HttpStatus } from '@nestjs/common';
import { DomainExceptionCode } from '../../../common/src/exceptions';

const HTTP_STATUS_BY_CODE: Record<DomainExceptionCode, HttpStatus> = {
  [DomainExceptionCode.BadRequest]: HttpStatus.BAD_REQUEST,
  [DomainExceptionCode.ValidationFailed]: HttpStatus.BAD_REQUEST,
  [DomainExceptionCode.Unauthorized]: HttpStatus.UNAUTHORIZED,
  [DomainExceptionCode.Forbidden]: HttpStatus.FORBIDDEN,
  [DomainExceptionCode.NotFound]: HttpStatus.NOT_FOUND,
  [DomainExceptionCode.AlreadyExists]: HttpStatus.CONFLICT,
  [DomainExceptionCode.EmailAlreadyExists]: HttpStatus.CONFLICT,
  [DomainExceptionCode.Conflict]: HttpStatus.CONFLICT,
  [DomainExceptionCode.InvalidBusinessState]: HttpStatus.CONFLICT,
  [DomainExceptionCode.PayloadTooLarge]: HttpStatus.PAYLOAD_TOO_LARGE,
  [DomainExceptionCode.UnsupportedMediaType]: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  [DomainExceptionCode.TooManyRequests]: HttpStatus.TOO_MANY_REQUESTS,
  [DomainExceptionCode.ServiceUnavailable]: HttpStatus.SERVICE_UNAVAILABLE,
  [DomainExceptionCode.GatewayTimeout]: HttpStatus.GATEWAY_TIMEOUT,
};

export function domainCodeToHttpStatus(code: DomainExceptionCode): HttpStatus {
  return HTTP_STATUS_BY_CODE[code];
}

export function httpStatusToErrorCode(statusCode: number): string {
  const codeByStatus: Readonly<Record<number, string>> = {
    400: DomainExceptionCode.BadRequest,
    401: DomainExceptionCode.Unauthorized,
    403: DomainExceptionCode.Forbidden,
    404: DomainExceptionCode.NotFound,
    409: DomainExceptionCode.Conflict,
    413: DomainExceptionCode.PayloadTooLarge,
    415: DomainExceptionCode.UnsupportedMediaType,
    429: DomainExceptionCode.TooManyRequests,
    503: DomainExceptionCode.ServiceUnavailable,
    504: DomainExceptionCode.GatewayTimeout,
  };

  return (
    codeByStatus[statusCode] ??
    (statusCode >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : DomainExceptionCode.BadRequest)
  );
}
