import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import { setupGrpcFilters, setupLogger } from '../../../libs/bootstrap/src/index';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { PostsConfig } from './common/config/posts-config';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-post-service'));

  const app = await NestFactory.create(AppModule);
  const postsConfig = app.get(PostsConfig);

  setupLogger(app);
  setupGrpcFilters(app);

  await app.listen(postsConfig.port);
}

void bootstrap();
