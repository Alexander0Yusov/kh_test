import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConfig } from '../../../../../libs/common/src/config/core-config';
import { PostsConfig } from './posts-config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
  ],
  providers: [CoreConfig, PostsConfig],
  exports: [CoreConfig, PostsConfig],
})
export class PostsConfigModule {}
