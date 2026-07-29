import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { setupGrpcFilters, setupLogger } from '../../../libs/bootstrap/src';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { CoreConfig } from '../../../libs/common/src/config/core-config';
import { POSTS_V1_PACKAGE_NAME } from '../../../libs/contracts/src';
import { PostsConfig } from './common/config/posts-config';
import { setupUserEventsTopology } from './common/rabbitmq/setup-user-events-topology';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-post-service'));

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const postsConfig = app.get(PostsConfig);
  const coreConfig = app.get(CoreConfig);

  setupLogger(app);
  setupGrpcFilters(app);
  await setupUserEventsTopology(coreConfig);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        url: postsConfig.grpcUrl,
        package: POSTS_V1_PACKAGE_NAME,
        protoPath: join(
          process.cwd(),
          'libs',
          'contracts',
          'src',
          'proto',
          'posts.proto',
        ),
      },
    },
    { inheritAppConfig: true },
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [coreConfig.rabbitmqUrl],
      queue: coreConfig.rabbitMqPostsUserEventsQueue,
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
