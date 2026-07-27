import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { setupGrpcFilters, setupLogger } from '../../../libs/bootstrap/src/index';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { FilesConfig } from './common/config/files-config';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-file-service'));

  const app = await NestFactory.create(AppModule);
  const filesConfig = app.get(FilesConfig);

  setupLogger(app);
  setupGrpcFilters(app);

  await app.listen(filesConfig.port);
}

void bootstrap();
