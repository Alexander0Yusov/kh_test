import { status } from '@grpc/grpc-js';
import { DomainExceptionCode } from '../../../common/src/exceptions';
import {
  domainCodeToGrpcStatus,
  grpcStatusToDomainCode,
} from './grpc-status.mapper';

describe('gRPC status mapper', () => {
  it.each([
    [DomainExceptionCode.BadRequest, status.INVALID_ARGUMENT],
    [DomainExceptionCode.ValidationFailed, status.INVALID_ARGUMENT],
    [DomainExceptionCode.Unauthorized, status.UNAUTHENTICATED],
    [DomainExceptionCode.Forbidden, status.PERMISSION_DENIED],
    [DomainExceptionCode.NotFound, status.NOT_FOUND],
    [DomainExceptionCode.AlreadyExists, status.ALREADY_EXISTS],
    [DomainExceptionCode.EmailAlreadyExists, status.ALREADY_EXISTS],
    [DomainExceptionCode.Conflict, status.ABORTED],
    [DomainExceptionCode.InvalidBusinessState, status.FAILED_PRECONDITION],
    [DomainExceptionCode.PayloadTooLarge, status.RESOURCE_EXHAUSTED],
    [DomainExceptionCode.UnsupportedMediaType, status.INVALID_ARGUMENT],
    [DomainExceptionCode.TooManyRequests, status.RESOURCE_EXHAUSTED],
    [DomainExceptionCode.ServiceUnavailable, status.UNAVAILABLE],
    [DomainExceptionCode.GatewayTimeout, status.DEADLINE_EXCEEDED],
  ])('maps %s to %s', (code, expectedStatus) => {
    expect(domainCodeToGrpcStatus(code)).toBe(expectedStatus);
  });

  it.each([
    [status.INVALID_ARGUMENT, DomainExceptionCode.ValidationFailed],
    [status.UNAUTHENTICATED, DomainExceptionCode.Unauthorized],
    [status.PERMISSION_DENIED, DomainExceptionCode.Forbidden],
    [status.NOT_FOUND, DomainExceptionCode.NotFound],
    [status.ALREADY_EXISTS, DomainExceptionCode.AlreadyExists],
    [status.ABORTED, DomainExceptionCode.Conflict],
    [status.FAILED_PRECONDITION, DomainExceptionCode.InvalidBusinessState],
    [status.RESOURCE_EXHAUSTED, DomainExceptionCode.TooManyRequests],
    [status.DEADLINE_EXCEEDED, DomainExceptionCode.GatewayTimeout],
    [status.UNAVAILABLE, DomainExceptionCode.ServiceUnavailable],
    [status.UNKNOWN, DomainExceptionCode.ServiceUnavailable],
  ])('maps gRPC %s to %s', (grpcStatus, expectedCode) => {
    expect(grpcStatusToDomainCode(grpcStatus)).toBe(expectedCode);
  });
});
