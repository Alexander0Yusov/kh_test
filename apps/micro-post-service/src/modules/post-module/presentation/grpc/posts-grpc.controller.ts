import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type CreateRootPostRequest,
  type Empty,
  type PostDto,
  POSTS_SERVICE_NAME,
} from '../../../../../../../libs/contracts/src';
import {
  CreateRootPostCommand,
  type CreateRootPostResult,
} from '../../application/commands/create-root-post.command';
import { EraseAllDataCommand } from '../../application/commands/erase-all-data.command';

@Controller()
export class PostsGrpcController {
  public constructor(private readonly commandBus: CommandBus) {}

  @GrpcMethod(POSTS_SERVICE_NAME, 'CreateRootPost')
  public async createRootPost(
    request: CreateRootPostRequest,
  ): Promise<PostDto> {
    const result = await this.commandBus.execute<
      CreateRootPostCommand,
      CreateRootPostResult
    >(
      new CreateRootPostCommand(
        request.userId,
        request.message,
        request.attachmentFileId ?? null,
      ),
    );
    const milliseconds = result.createdAt.getTime();

    return {
      id: result.id,
      userId: result.userId,
      parentId: undefined,
      rootId: undefined,
      path: result.path,
      childCounter: result.childCounter,
      message: result.message,
      attachmentFileId: result.attachmentFileId ?? undefined,
      createdAt: {
        seconds: Math.floor(milliseconds / 1000),
        nanos: (milliseconds % 1000) * 1_000_000,
      },
    };
  }

  @GrpcMethod(POSTS_SERVICE_NAME, 'EraseAllData')
  public async eraseAllData(): Promise<Empty> {
    await this.commandBus.execute(new EraseAllDataCommand());
    return {};
  }
}
