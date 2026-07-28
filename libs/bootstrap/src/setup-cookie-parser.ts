import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export function setupCookieParser(app: INestApplication): void {
  app.use(cookieParser());
}
