import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { setupGrpcFilters } from '../../../libs/bootstrap/src';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { FILES_V1_PACKAGE_NAME } from '../../../libs/contracts/src';
import { FilesConfig } from './common/config/files-config';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-file-service'));

  const filesConfig = new FilesConfig(
    new ConfigService<Record<string, string>, true>(),
  );

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
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
  );
  app.enableShutdownHooks();
  setupGrpcFilters(app);

  await app.listen();
}

void bootstrap();
