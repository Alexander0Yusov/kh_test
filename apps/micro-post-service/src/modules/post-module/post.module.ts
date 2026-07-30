import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../common/prisma';
import { EraseAllDataHandler } from './application/commands/erase-all-data.command';
import { CreatePostHandler } from './application/commands/create-post.command';
import { PostEventsPublisher } from './application/contracts/post-events.publisher';
import { PostRepository } from './application/contracts/post.repository';
import { PostQueryRepository } from './application/contracts/post-query.repository';
import { GetRootPostsHandler } from './application/queries/get-root-posts.query';
import { GetPostsByRootIdsHandler } from './application/queries/get-posts-by-root-ids.query';
import { GetPostHandler } from './application/queries/get-post.query';
import {
  PrismaPostQueryRepository,
  PrismaPostRepository,
} from './infrastructure/prisma-post.repositories';
import { RabbitMqPostEventsPublisher } from './infrastructure/rabbitmq-post-events.publisher';
import { PostsGrpcController } from './presentation/grpc/posts-grpc.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [PostsGrpcController],
  providers: [
    EraseAllDataHandler,
    CreatePostHandler,
    GetRootPostsHandler,
    GetPostsByRootIdsHandler,
    GetPostHandler,
    {
      provide: PostEventsPublisher,
      useClass: RabbitMqPostEventsPublisher,
    },
    {
      provide: PostRepository,
      useClass: PrismaPostRepository,
    },
    {
      provide: PostQueryRepository,
      useClass: PrismaPostQueryRepository,
    },
  ],
})
export class PostModule {}
