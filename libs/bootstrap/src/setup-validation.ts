import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

export function setupValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
    }),
  );
}
