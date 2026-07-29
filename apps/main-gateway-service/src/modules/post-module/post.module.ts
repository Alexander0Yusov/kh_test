import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  type ClientProvider,
  ClientsModule,
  Transport,
} from '@nestjs/microservices';
import { join } from 'node:path';
import { GatewayConfig } from '../../common/config/gateway-config';
import {
  POSTS_SERVICE_NAME,
  POSTS_V1_PACKAGE_NAME,
} from '../../../../../libs/contracts/src';
import { PostsClient } from './application/contracts/posts.client';
import { PostsGrpcClient } from './infrastructure/posts-grpc.client';
import { CreatePostHandler } from './application/commands/create-post.command';
import { FileModule } from '../file-module/file.module';
import { UserModule } from '../user-module';
import { PostsController } from './presentation/posts.controller';

function createPostsClientOptions(config: GatewayConfig): ClientProvider {
  return {
    transport: Transport.GRPC,
    options: {
      url: config.postServiceGrpcUrl,
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
  };
}

@Module({
  imports: [
    CqrsModule,
    FileModule,
    UserModule,
    ClientsModule.registerAsync([
      {
        name: POSTS_SERVICE_NAME,
        inject: [GatewayConfig],
        useFactory: createPostsClientOptions,
      },
    ]),
  ],
  controllers: [PostsController],
  providers: [
    CreatePostHandler,
    {
      provide: PostsClient,
      useClass: PostsGrpcClient,
    },
  ],
  exports: [PostsClient],
})
export class PostModule {}
