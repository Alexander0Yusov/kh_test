import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import {
  setupCors,
  setupHelmet,
  setupHttpFilters,
  setupInterceptors,
  setupLogger,
  setupValidation,
} from '../../../libs/bootstrap/src/index';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { GatewayConfig } from './common/config/gateway-config';
import { configureSwagger } from './common/swagger/configure-swagger';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'main-gateway-service'));

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const gatewayConfig = app.get(GatewayConfig);

  setupValidation(app);
  setupLogger(app);

  setupHttpFilters(app);
  setupInterceptors(app);

  setupHelmet(app);
  setupCors(app);
  configureSwagger(app);

  await app.listen(gatewayConfig.port);
}

void bootstrap();
