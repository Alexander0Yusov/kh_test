import type { INestApplication } from '@nestjs/common';

export function setupCors(app: INestApplication, origin: string): void {
  app.enableCors({
    origin: [origin],
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
