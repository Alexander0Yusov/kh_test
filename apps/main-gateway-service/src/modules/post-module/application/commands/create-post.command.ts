import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import sanitizeHtml from 'sanitize-html';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { PostsClient } from '../contracts/posts.client';

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
    public readonly message: string,
    public readonly attachmentFileId: string | null,
    public readonly parentId: string | null,
  ) {}
}

export type CreatePostResult = {
  id: string;
  parentId: string | null;
  message: string;
  publishDate: Date;
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

    if (command.attachmentFileId !== null) {
      await this.ensureAttachmentUploaded(command.attachmentFileId);
    }

    const post = await this.postsClient.createPost({
      userId: command.userId,
      message,
      attachmentFileId: command.attachmentFileId,
      parentId: command.parentId,
    });
    let attachmentUrl: string | null = null;

    if (command.attachmentFileId !== null) {
      const files = await this.filesClient.getFiles([command.attachmentFileId]);
      const file = files.find(
        ({ fileId }) => fileId === command.attachmentFileId,
      );

      if (file === undefined) {
        throw new DomainException({
          code: DomainExceptionCode.ServiceUnavailable,
          message: 'Attachment URL is temporarily unavailable.',
        });
      }

      attachmentUrl = file.publicUrl;
    }

    return {
      id: post.id,
      parentId: post.parentId,
      message: post.message,
      publishDate: post.createdAt,
      attachmentUrl,
    };
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
