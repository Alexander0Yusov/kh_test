import { Module } from '@nestjs/common';
import { PostsConfigModule } from '../common/config/posts-config.module';
import { PrismaModule } from '../common/prisma';
import { PostModule } from './post-module/post.module';

@Module({
  imports: [PostsConfigModule, PrismaModule, PostModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
