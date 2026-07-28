import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function setupHelmet(
  app: INestApplication,
  swaggerEnabled = false,
): void {
  if (!swaggerEnabled) {
    app.use(helmet());
    return;
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
}
