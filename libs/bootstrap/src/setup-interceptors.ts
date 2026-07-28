import type { INestApplication } from '@nestjs/common';

export function setupInterceptors(app: INestApplication): void {
  // No interceptors configured in current scope
  void app;
}
