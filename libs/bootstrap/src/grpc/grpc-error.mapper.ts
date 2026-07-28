import type { ServiceError } from '@grpc/grpc-js';
import {
  DomainException,
  DomainExceptionCode,
  parseErrorResponse,
} from '../../../common/src/exceptions';
import { grpcStatusToDomainCode } from '../filters/grpc-status.mapper';

export function grpcErrorToDomainException(
  error: Pick<ServiceError, 'code' | 'details'>,
): DomainException {
  const response = parseErrorResponse(error.details);

  if (response && isDomainExceptionCode(response.code)) {
    return new DomainException({
      code: response.code,
      message: response.message,
      extensions:
        response.field === null
          ? []
          : [{ field: response.field, message: response.message }],
    });
  }

  return new DomainException({
    code: grpcStatusToDomainCode(error.code),
    message: 'Dependent service request failed',
  });
}

function isDomainExceptionCode(value: string): value is DomainExceptionCode {
  const domainCodes = new Set<string>(Object.values(DomainExceptionCode));
  return domainCodes.has(value);
}
