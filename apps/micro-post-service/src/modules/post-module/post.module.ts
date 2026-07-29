import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../common/prisma';
import { EraseAllDataHandler } from './application/commands/erase-all-data.command';
import { PostUserRepository } from './application/contracts/post-user.repository';
import { PostRepository } from './application/contracts/post.repository';
import {
  PrismaPostRepository,
  PrismaPostUserRepository,
} from './infrastructure/prisma-post.repositories';
import { PostsGrpcController } from './presentation/grpc/posts-grpc.controller';
import { UserCreatedConsumer } from './presentation/rabbitmq/user-created.consumer';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [PostsGrpcController, UserCreatedConsumer],
  providers: [
    EraseAllDataHandler,
    {
      provide: PostUserRepository,
      useClass: PrismaPostUserRepository,
    },
    {
      provide: PostRepository,
      useClass: PrismaPostRepository,
    },
  ],
})
export class PostModule {}
