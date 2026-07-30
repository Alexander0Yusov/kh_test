import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { setupGrpcFilters, setupLogger } from '../../../libs/bootstrap/src';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { POSTS_V1_PACKAGE_NAME } from '../../../libs/contracts/src';
import { PostsConfig } from './common/config/posts-config';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-post-service'));

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const postsConfig = app.get(PostsConfig);
  setupLogger(app);
  setupGrpcFilters(app);

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

  await app.startAllMicroservices();
  await app.init();
}

void bootstrap();
