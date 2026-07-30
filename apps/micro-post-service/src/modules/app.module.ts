import {
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PostsConfigModule } from '../common/config/posts-config.module';
import { PrismaModule } from '../common/prisma';
import { PostModule } from './post-module/post.module';

@Injectable()
class PostsServiceLifecycleLogger
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PostsServiceLifecycleLogger.name);

  public onApplicationBootstrap(): void {
    this.logger.log('Posts Service started');
  }

  public onApplicationShutdown(): void {
    this.logger.log('Posts Service stopped');
  }
}

@Module({
  imports: [PostsConfigModule, PrismaModule, PostModule],
  controllers: [],
  providers: [PostsServiceLifecycleLogger],
})
export class AppModule {}
