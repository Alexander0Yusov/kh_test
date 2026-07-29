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

export class CreatePostCommand {
  public constructor(
    public readonly userId: string,
    public readonly message: string,
    public readonly attachmentFileId: string | null,
    public readonly parentId: string | null,
  ) {}
}

export type CreatePostResult = {
  id: string;
  userId: string;
  parentId: string | null;
  rootId: string | null;
  path: string;
  childCounter: number;
  message: string;
  attachmentFileId: string | null;
  createdAt: Date;
};

@CommandHandler(CreatePostCommand)
export class CreatePostHandler implements ICommandHandler<
  CreatePostCommand,
  CreatePostResult
> {
  public constructor(
    private readonly postUserRepository: PostUserRepository,
    private readonly postRepository: PostRepository,
    private readonly postEventsPublisher: PostEventsPublisher,
  ) {}

  public async execute(command: CreatePostCommand): Promise<CreatePostResult> {
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

    const id = randomUUID();
    const post =
      command.parentId === null
        ? new PostEntity({
            id,
            userId: command.userId,
            message: command.message,
            parentId: null,
            rootId: null,
            path: '1',
            childCounter: 0,
            attachmentFileId: command.attachmentFileId,
          })
        : await this.postRepository.createReply({
            id,
            userId: command.userId,
            parentId: command.parentId,
            message: command.message,
            attachmentFileId: command.attachmentFileId,
          });

    if (command.parentId === null) {
      await this.postRepository.create(post);
    }
    await this.postEventsPublisher.publishCreated({
      postId: post.id,
      userId: post.userId,
      attachmentFileId: post.attachmentFileId,
    });

    return {
      id: post.id,
      userId: post.userId,
      parentId: post.parentId,
      rootId: post.rootId,
      path: post.path,
      childCounter: post.childCounter,
      message: post.message,
      attachmentFileId: post.attachmentFileId,
      createdAt: post.createdAt,
    };
  }
}
