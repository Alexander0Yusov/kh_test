import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesConfig } from '../../../../common/config/files-config';
import { FileEntity, FileStatus } from '../../domain';
import { FileRepository } from '../contracts/file.repository';
import { StorageAdapter } from '../contracts/storage.adapter';

const CONTENT_TYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.txt': 'text/plain',
} as const;

type SupportedExtension = keyof typeof CONTENT_TYPE_BY_EXTENSION;

export class CreateUploadCommand {
  public constructor(
    public readonly fileExtension: string,
    public readonly fileSize: number,
  ) {}
}

export type CreateUploadResult = {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  fileId: string;
};

@CommandHandler(CreateUploadCommand)
export class CreateUploadHandler implements ICommandHandler<
  CreateUploadCommand,
  CreateUploadResult
> {
  public constructor(
    private readonly fileRepository: FileRepository,
    private readonly storageAdapter: StorageAdapter,
    private readonly filesConfig: FilesConfig,
  ) {}

  public async execute(
    command: CreateUploadCommand,
  ): Promise<CreateUploadResult> {
    const extension = this.normalizeExtension(command.fileExtension);
    this.validateFileSize(command.fileSize);

    const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
    const fileId = randomUUID();
    const s3Key = `files/${fileId}${extension}`;
    const presignedPost = await this.storageAdapter.createPresignedPost({
      key: s3Key,
      contentType,
      maxSizeBytes: command.fileSize,
      expiresInSeconds: this.filesConfig.presignedPostTtlSeconds,
    });

    const file = new FileEntity({
      id: fileId,
      s3Key,
      bucket: this.filesConfig.filesStorageBucket,
      extension,
      size: command.fileSize,
      width: null,
      height: null,
      status: FileStatus.Pending,
    });

    await this.fileRepository.create(file);

    return {
      uploadUrl: presignedPost.uploadUrl,
      uploadFields: presignedPost.uploadFields,
      fileId,
    };
  }

  private normalizeExtension(extension: string): SupportedExtension {
    const normalizedExtension =
      typeof extension === 'string' ? extension.toLowerCase() : '';

    if (!(normalizedExtension in CONTENT_TYPE_BY_EXTENSION)) {
      throw new DomainException({
        code: DomainExceptionCode.UnsupportedMediaType,
        message: 'File extension is not supported.',
        extensions: [
          {
            field: 'fileExtension',
            message: 'File extension is not supported.',
          },
        ],
      });
    }

    return normalizedExtension as SupportedExtension;
  }

  private validateFileSize(fileSize: number): void {
    if (
      typeof fileSize !== 'number' ||
      !Number.isFinite(fileSize) ||
      !Number.isInteger(fileSize) ||
      fileSize <= 0
    ) {
      throw new DomainException({
        code: DomainExceptionCode.ValidationFailed,
        message: 'File size must be a positive integer.',
        extensions: [
          {
            field: 'fileSize',
            message: 'File size must be a positive integer.',
          },
        ],
      });
    }

    if (fileSize > this.filesConfig.maxUploadSizeBytes) {
      throw new DomainException({
        code: DomainExceptionCode.PayloadTooLarge,
        message: 'File size exceeds the configured upload limit.',
        extensions: [
          {
            field: 'fileSize',
            message: 'File size exceeds the configured upload limit.',
          },
        ],
      });
    }
  }
}
