import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PostEntity } from '../../domain';
import { PostEventsPublisher } from '../contracts/post-events.publisher';
import { PostRepository } from '../contracts/post.repository';

export class CreatePostCommand {
  public constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly email: string,
    public readonly homePage: string | null,
    public readonly message: string,
    public readonly attachmentFileId: string | null,
    public readonly parentId: string | null,
  ) {}
}

export type CreatePostResult = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  homePage: string | null;
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
    private readonly postRepository: PostRepository,
    private readonly postEventsPublisher: PostEventsPublisher,
  ) {}

  public async execute(command: CreatePostCommand): Promise<CreatePostResult> {
    const id = randomUUID();
    const post =
      command.parentId === null
        ? new PostEntity({
            id,
            userId: command.userId,
            userName: command.userName,
            email: command.email,
            homePage: command.homePage,
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
            userName: command.userName,
            email: command.email,
            homePage: command.homePage,
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
      parentId: post.parentId,
      rootId: post.rootId,
      publishDate: post.createdAt.toISOString(),
      userName: post.userName,
      email: post.email,
      attachmentFileId: post.attachmentFileId,
    });

    return {
      id: post.id,
      userId: post.userId,
      userName: post.userName,
      email: post.email,
      homePage: post.homePage,
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
