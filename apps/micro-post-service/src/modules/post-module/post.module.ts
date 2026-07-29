import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../common/prisma';
import { EraseAllDataHandler } from './application/commands/erase-all-data.command';
import { CreatePostHandler } from './application/commands/create-post.command';
import { PostEventsPublisher } from './application/contracts/post-events.publisher';
import { PostUserRepository } from './application/contracts/post-user.repository';
import { PostRepository } from './application/contracts/post.repository';
import { PostQueryRepository } from './application/contracts/post-query.repository';
import { GetRootPostsHandler } from './application/queries/get-root-posts.query';
import { GetPostsByRootIdsHandler } from './application/queries/get-posts-by-root-ids.query';
import {
  PrismaPostQueryRepository,
  PrismaPostRepository,
  PrismaPostUserRepository,
} from './infrastructure/prisma-post.repositories';
import { RabbitMqPostEventsPublisher } from './infrastructure/rabbitmq-post-events.publisher';
import { PostsGrpcController } from './presentation/grpc/posts-grpc.controller';
import { UserCreatedConsumer } from './presentation/rabbitmq/user-created.consumer';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [PostsGrpcController, UserCreatedConsumer],
  providers: [
    EraseAllDataHandler,
    CreatePostHandler,
    GetRootPostsHandler,
    GetPostsByRootIdsHandler,
    {
      provide: PostEventsPublisher,
      useClass: RabbitMqPostEventsPublisher,
    },
    {
      provide: PostUserRepository,
      useClass: PrismaPostUserRepository,
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
