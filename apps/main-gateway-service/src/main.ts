import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import {
  setupCors,
  setupCookieParser,
  setupHelmet,
  setupHttpFilters,
  setupInterceptors,
  setupLogger,
  setupValidation,
} from '../../../libs/bootstrap/src/index';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { GatewayConfig } from './common/config/gateway-config';
import { setupFileEventsTopology } from './common/rabbitmq/setup-file-events-topology';
import { setupSwagger } from './common/swagger/setup-swagger';
import { CoreConfig } from '../../../libs/common/src/config/core-config';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'main-gateway-service'));

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  const gatewayConfig = app.get(GatewayConfig);
  const coreConfig = app.get(CoreConfig);

  setupValidation(app);
  setupCookieParser(app);
  setupLogger(app);

  setupHttpFilters(app);
  setupInterceptors(app);

  setupHelmet(app, gatewayConfig.swaggerEnabled);
  setupCors(app);
  setupSwagger(app);

  await setupFileEventsTopology(coreConfig);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [coreConfig.rabbitmqUrl],
      queue: coreConfig.rabbitMqGatewayFilesQueue,
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(gatewayConfig.port);
}

void bootstrap();
