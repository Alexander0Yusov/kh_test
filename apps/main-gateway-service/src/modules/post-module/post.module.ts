import { Module } from '@nestjs/common';
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
    ClientsModule.registerAsync([
      {
        name: POSTS_SERVICE_NAME,
        inject: [GatewayConfig],
        useFactory: createPostsClientOptions,
      },
    ]),
  ],
  providers: [
    {
      provide: PostsClient,
      useClass: PostsGrpcClient,
    },
  ],
  exports: [PostsClient],
})
export class PostModule {}
