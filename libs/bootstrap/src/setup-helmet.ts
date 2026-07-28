import type { INestApplication } from '@nestjs/common';

export function setupHelmet(app: INestApplication): void {
  // Requires 'helmet' package to be installed
  // app.use(helmet());
  void app;
}
