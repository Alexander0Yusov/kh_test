import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

export function setupLogger(app: INestApplication): void {
  app.useLogger(new Logger());
}
