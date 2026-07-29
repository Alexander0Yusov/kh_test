import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { PostEntity } from '../../domain';
import { PostEventsPublisher } from '../contracts/post-events.publisher';
import { PostUserRepository } from '../contracts/post-user.repository';
import { PostRepository } from '../contracts/post.repository';

export class CreateRootPostCommand {
  public constructor(
    public readonly userId: string,
    public readonly message: string,
    public readonly attachmentFileId: string | null,
  ) {}
}

export type CreateRootPostResult = {
  id: string;
  userId: string;
  parentId: null;
  rootId: null;
  path: string;
  childCounter: number;
  message: string;
  attachmentFileId: string | null;
  createdAt: Date;
};

@CommandHandler(CreateRootPostCommand)
export class CreateRootPostHandler implements ICommandHandler<
  CreateRootPostCommand,
  CreateRootPostResult
> {
  public constructor(
    private readonly postUserRepository: PostUserRepository,
    private readonly postRepository: PostRepository,
    private readonly postEventsPublisher: PostEventsPublisher,
  ) {}

  public async execute(
    command: CreateRootPostCommand,
  ): Promise<CreateRootPostResult> {
    if ((await this.postUserRepository.findById(command.userId)) === null) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'The Posts user projection is not ready.',
        extensions: [
          {
            field: 'userId',
            message: 'The Posts user projection is not ready.',
          },
        ],
      });
    }

    const post = new PostEntity({
      id: randomUUID(),
      userId: command.userId,
      message: command.message,
      parentId: null,
      rootId: null,
      path: '1',
      childCounter: 0,
      attachmentFileId: command.attachmentFileId,
    });

    await this.postRepository.create(post);
    await this.postEventsPublisher.publishCreated({
      postId: post.id,
      userId: post.userId,
      attachmentFileId: post.attachmentFileId,
    });

    return {
      id: post.id,
      userId: post.userId,
      parentId: null,
      rootId: null,
      path: post.path,
      childCounter: post.childCounter,
      message: post.message,
      attachmentFileId: post.attachmentFileId,
      createdAt: post.createdAt,
    };
  }
}
