import { Module } from '@nestjs/common';
import { PostsConfigModule } from '../common/config/posts-config.module';
import { PrismaModule } from '../common/prisma';

@Module({
  imports: [PostsConfigModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
