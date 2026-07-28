import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './modules/app.module';
import {
  setupHttpFilters,
  setupInterceptors,
  setupLogger,
  setupValidation,
} from '../../../libs/bootstrap/src/index';
import { loadServiceEnvironment } from '../../../libs/common/src/config';
import { PostsConfig } from './common/config/posts-config';

async function bootstrap(): Promise<void> {
  loadServiceEnvironment(join(process.cwd(), 'apps', 'micro-post-service'));

  const app = await NestFactory.create(AppModule);
  const postsConfig = app.get(PostsConfig);

  setupValidation(app);
  setupLogger(app);

  setupHttpFilters(app);
  setupInterceptors(app);

  await app.listen(postsConfig.port);
}

void bootstrap();
