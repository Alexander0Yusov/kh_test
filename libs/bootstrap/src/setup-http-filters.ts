import type { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';

export function setupHttpFilters(app: INestApplication): void {
  app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
}
