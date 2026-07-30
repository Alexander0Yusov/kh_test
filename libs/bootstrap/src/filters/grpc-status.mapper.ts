import { status } from '@grpc/grpc-js';
import { DomainExceptionCode } from '../../../common/src/exceptions';

const GRPC_STATUS_BY_CODE: Record<DomainExceptionCode, status> = {
  [DomainExceptionCode.BadRequest]: status.INVALID_ARGUMENT,
  [DomainExceptionCode.ValidationFailed]: status.INVALID_ARGUMENT,
  [DomainExceptionCode.InvalidCaptcha]: status.INVALID_ARGUMENT,
  [DomainExceptionCode.Unauthorized]: status.UNAUTHENTICATED,
  [DomainExceptionCode.Forbidden]: status.PERMISSION_DENIED,
  [DomainExceptionCode.NotFound]: status.NOT_FOUND,
  [DomainExceptionCode.AlreadyExists]: status.ALREADY_EXISTS,
  [DomainExceptionCode.EmailAlreadyExists]: status.ALREADY_EXISTS,
  [DomainExceptionCode.Conflict]: status.ABORTED,
  [DomainExceptionCode.InvalidBusinessState]: status.FAILED_PRECONDITION,
  [DomainExceptionCode.PayloadTooLarge]: status.RESOURCE_EXHAUSTED,
  [DomainExceptionCode.UnsupportedMediaType]: status.INVALID_ARGUMENT,
  [DomainExceptionCode.TooManyRequests]: status.RESOURCE_EXHAUSTED,
  [DomainExceptionCode.ServiceUnavailable]: status.UNAVAILABLE,
  [DomainExceptionCode.GatewayTimeout]: status.DEADLINE_EXCEEDED,
};

export function domainCodeToGrpcStatus(code: DomainExceptionCode): status {
  return GRPC_STATUS_BY_CODE[code];
}

export function grpcStatusToDomainCode(
  grpcStatus: number,
): DomainExceptionCode {
  const codeByStatus: Readonly<Record<number, DomainExceptionCode>> = {
    3: DomainExceptionCode.ValidationFailed,
    4: DomainExceptionCode.GatewayTimeout,
    5: DomainExceptionCode.NotFound,
    6: DomainExceptionCode.AlreadyExists,
    7: DomainExceptionCode.Forbidden,
    8: DomainExceptionCode.TooManyRequests,
    9: DomainExceptionCode.InvalidBusinessState,
    10: DomainExceptionCode.Conflict,
    14: DomainExceptionCode.ServiceUnavailable,
    16: DomainExceptionCode.Unauthorized,
  };

  return codeByStatus[grpcStatus] ?? DomainExceptionCode.ServiceUnavailable;
}
