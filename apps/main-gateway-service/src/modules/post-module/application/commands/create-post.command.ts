import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import sanitizeHtml from 'sanitize-html';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { PostsClient } from '../contracts/posts.client';
import { UserRepository } from '../../../user-module/application/contracts/user.repository';
import { CaptchaService } from '../queries/get-captcha.query';
import {
  buildPostResponse,
  FULL_POST_FIELDS,
} from '../queries/get-posts.query';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['a', 'strong', 'i', 'code'],
  allowedAttributes: {
    a: ['href', 'title'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
};

export class CreatePostCommand {
  public constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly email: string,
    public readonly homePage: string | null,
    public readonly captchaId: string,
    public readonly captchaValue: string,
    public readonly message: string,
    public readonly attachmentFileId: string | null,
    public readonly parentId: string | null,
  ) {}
}

export type CreatePostResult = {
  id: string;
  parentId: string | null;
  rootId: string | null;
  path: string;
  message: string;
  publishDate: Date;
  userName: string;
  email: string;
  homePage: string | null;
  avatarUrl: string | null;
  attachmentUrl: string | null;
};

@CommandHandler(CreatePostCommand)
export class CreatePostHandler implements ICommandHandler<
  CreatePostCommand,
  CreatePostResult
> {
  public constructor(
    private readonly filesClient: FilesClient,
    private readonly postsClient: PostsClient,
    private readonly userRepository: UserRepository,
    private readonly captchaService: CaptchaService,
  ) {}

  public async execute(command: CreatePostCommand): Promise<CreatePostResult> {
    const message = sanitizeHtml(command.message, SANITIZE_OPTIONS).trim();

    if (message.length === 0) {
      throw new DomainException({
        code: DomainExceptionCode.ValidationFailed,
        message: 'Validation failed.',
        extensions: [
          {
            field: 'message',
            message: 'Validation failed.',
          },
        ],
      });
    }

    this.captchaService.verifyAndConsume(
      command.captchaId,
      command.captchaValue,
    );

    if (command.attachmentFileId !== null) {
      await this.ensureAttachmentUploaded(command.attachmentFileId);
    }

    const post = await this.postsClient.createPost({
      userId: command.userId,
      userName: command.userName,
      email: command.email.trim().toLowerCase(),
      homePage:
        command.homePage === null || command.homePage.trim().length === 0
          ? null
          : command.homePage.trim(),
      message,
      attachmentFileId: command.attachmentFileId,
      parentId: command.parentId,
    });
    const user = await this.userRepository.findById(command.userId);
    if (user === null) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Post author data is unavailable.',
      });
    }
    const fileIds = [
      user.avatarFileId,
      ...(post.attachmentFileId === null ? [] : [post.attachmentFileId]),
    ];
    const files = await this.filesClient.getFiles([...new Set(fileIds)]);
    const urls = new Map(files.map((file) => [file.fileId, file.publicUrl]));

    return buildPostResponse(
      { ...post, userId: command.userId },
      user,
      urls,
      new Set(FULL_POST_FIELDS),
    ) as CreatePostResult;
  }

  private async ensureAttachmentUploaded(
    attachmentFileId: string,
  ): Promise<void> {
    try {
      await this.filesClient.ensureUploaded(attachmentFileId);
    } catch (error: unknown) {
      if (!(error instanceof DomainException)) {
        throw error;
      }

      throw new DomainException({
        code: error.code,
        message: error.message,
        extensions: error.extensions.map((extension) => ({
          field:
            extension.field === 'avatarFileId'
              ? 'attachmentFileId'
              : extension.field,
          message: extension.message,
        })),
      });
    }
  }
}
