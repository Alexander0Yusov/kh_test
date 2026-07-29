import type { INestApplication, INestMicroservice } from '@nestjs/common';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';

export function setupGrpcFilters(
  app: INestApplication | INestMicroservice,
): void {
  app.useGlobalFilters(new GrpcExceptionFilter());
}
