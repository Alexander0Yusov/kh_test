import type { INestMicroservice } from '@nestjs/common';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';

export function setupGrpcFilters(app: INestMicroservice): void {
  app.useGlobalFilters(new GrpcExceptionFilter());
}
