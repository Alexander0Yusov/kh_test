import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GatewayConfig } from '../config/gateway-config';

export function setupSwagger(app: INestApplication): void {
  const gatewayConfig = app.get(GatewayConfig);

  if (!gatewayConfig.swaggerEnabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('DzenCode API')
    .setDescription('Public HTTP API exposed by API Gateway')
    .setVersion('1.0.0')
    .addTag('Users')
    .addTag('Auth')
    .addTag('Files')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer access token',
      },
      'accessToken',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'HttpOnly refresh token cookie',
      },
      'refreshToken',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    raw: ['json'],
    jsonDocumentUrl: 'docs-json',
    swaggerUrl: '/api/docs-json',
    customSiteTitle: 'DzenCode API',
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
  });
}
