import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { setupGrpcFilters, setupLogger } from '../../../libs/bootstrap/src';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { FILES_V1_PACKAGE_NAME } from '../../../libs/contracts/src';
import { FilesConfig } from './common/config/files-config';
import { CoreConfig } from '../../../libs/common/src/config/core-config';
import { setupUserEventsTopology } from './common/rabbitmq/setup-user-events-topology';
import { setupPostEventsTopology } from './common/rabbitmq/setup-post-events-topology';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-file-service'));

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const filesConfig = app.get(FilesConfig);
  const coreConfig = app.get(CoreConfig);

  setupLogger(app);
  await setupUserEventsTopology(coreConfig);
  await setupPostEventsTopology(coreConfig);
  setupGrpcFilters(app);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        url: filesConfig.grpcUrl,
        package: FILES_V1_PACKAGE_NAME,
        protoPath: join(
          process.cwd(),
          'libs',
          'contracts',
          'src',
          'proto',
          'files.proto',
        ),
        loader: {
          longs: Number,
        },
      },
    },
    { inheritAppConfig: true },
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [coreConfig.rabbitmqUrl],
      queue: coreConfig.rabbitMqFilesUserEventsQueue,
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 1,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [coreConfig.rabbitmqUrl],
      queue: coreConfig.rabbitMqFilesPostEventsQueue,
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.init();
}

void bootstrap();
