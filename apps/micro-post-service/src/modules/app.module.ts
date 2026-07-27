import { Module } from '@nestjs/common';
import { PostsConfigModule } from '../common/config/posts-config.module';

@Module({
  imports: [PostsConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
