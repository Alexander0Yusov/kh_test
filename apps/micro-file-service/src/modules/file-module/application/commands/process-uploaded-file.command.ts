import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import sharp from 'sharp';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesConfig } from '../../../../common/config/files-config';
import { FileEntity, FileStatus } from '../../domain';
import { FileRepository } from '../contracts/file.repository';
import { FileEventsPublisher } from '../contracts/file-events.publisher';
import {
  StorageAdapter,
  StorageObjectTooLargeError,
} from '../contracts/storage.adapter';

const IMAGE_FORMAT_BY_EXTENSION = {
  '.jpg': 'jpeg',
  '.png': 'png',
  '.gif': 'gif',
} as const;

type ImageExtension = keyof typeof IMAGE_FORMAT_BY_EXTENSION;

type Dimensions = {
  width: number | null;
  height: number | null;
};

class InvalidFileContentError extends Error {
  public constructor(
    public readonly code: DomainExceptionCode,
    message: string,
  ) {
    super(message);
    this.name = InvalidFileContentError.name;
  }
}

export class ProcessUploadedFileCommand {
  public constructor(public readonly fileId: string) {}
}

@CommandHandler(ProcessUploadedFileCommand)
export class ProcessUploadedFileHandler implements ICommandHandler<
  ProcessUploadedFileCommand,
  void
> {
  public constructor(
    private readonly fileRepository: FileRepository,
    private readonly storageAdapter: StorageAdapter,
    private readonly filesConfig: FilesConfig,
    private readonly fileEventsPublisher: FileEventsPublisher,
  ) {}

  public async execute(command: ProcessUploadedFileCommand): Promise<void> {
    const file = await this.fileRepository.findById(command.fileId);

    if (file === null) {
      throw this.notFound();
    }

    if (
      file.status === FileStatus.Uploaded ||
      file.status === FileStatus.Used ||
      file.status === FileStatus.Failed
    ) {
      return;
    }

    if (file.status === FileStatus.Rejected) {
      await this.storageAdapter.deleteObject(file.s3Key);
      return;
    }

    await this.processPending(file);
  }

  private async processPending(file: FileEntity): Promise<void> {
    const metadata = await this.storageAdapter.headObject(file.s3Key);

    if (metadata === null) {
      throw this.notFound();
    }

    if (metadata.size > this.filesConfig.maxUploadSizeBytes) {
      await this.reject(
        file,
        DomainExceptionCode.PayloadTooLarge,
        'Uploaded file exceeds the configured size limit.',
      );
    }

    if (metadata.size <= 0 || metadata.size !== file.size) {
      await this.reject(
        file,
        DomainExceptionCode.ValidationFailed,
        'Actual file size does not match the declared size.',
      );
    }

    let bytes: Uint8Array | null;

    try {
      bytes = await this.storageAdapter.getObject(
        file.s3Key,
        this.filesConfig.maxUploadSizeBytes,
      );
    } catch (error: unknown) {
      if (error instanceof StorageObjectTooLargeError) {
        await this.reject(
          file,
          DomainExceptionCode.PayloadTooLarge,
          'Uploaded file exceeds the configured size limit.',
        );
      }

      throw error;
    }

    if (bytes === null) {
      throw this.notFound();
    }

    if (bytes.byteLength !== metadata.size || bytes.byteLength !== file.size) {
      await this.reject(
        file,
        DomainExceptionCode.ValidationFailed,
        'Actual file size does not match the declared size.',
      );
    }

    let dimensions: Dimensions;

    try {
      dimensions = await this.inspectContent(file.extension, bytes);
    } catch (error: unknown) {
      if (error instanceof InvalidFileContentError) {
        await this.reject(file, error.code, error.message);
      }

      throw error;
    }

    file.markUploaded(dimensions.width, dimensions.height);
    await this.fileRepository.save(file);
    await this.fileEventsPublisher.publishUploaded({
      fileId: file.id,
      status: 'UPLOADED',
    });
  }

  private async inspectContent(
    extension: string,
    bytes: Uint8Array,
  ): Promise<Dimensions> {
    if (extension === '.txt') {
      this.validateText(bytes);
      return { width: null, height: null };
    }

    if (!(extension in IMAGE_FORMAT_BY_EXTENSION)) {
      throw new InvalidFileContentError(
        DomainExceptionCode.UnsupportedMediaType,
        'Stored file extension is not supported.',
      );
    }

    return this.inspectImage(extension as ImageExtension, bytes);
  }

  private async inspectImage(
    extension: ImageExtension,
    bytes: Uint8Array,
  ): Promise<Dimensions> {
    try {
      const image = sharp(Buffer.from(bytes), {
        animated: true,
        failOn: 'error',
      });
      const metadata = await image.metadata();
      const width = metadata.width;
      const height = metadata.pageHeight ?? metadata.height;

      if (metadata.format !== IMAGE_FORMAT_BY_EXTENSION[extension]) {
        throw new InvalidFileContentError(
          DomainExceptionCode.UnsupportedMediaType,
          'File content does not match its extension.',
        );
      }

      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width === undefined ||
        height === undefined ||
        width <= 0 ||
        height <= 0
      ) {
        throw new InvalidFileContentError(
          DomainExceptionCode.ValidationFailed,
          'Image dimensions are invalid.',
        );
      }

      await image.stats();

      return { width, height };
    } catch (error: unknown) {
      if (error instanceof InvalidFileContentError) {
        throw error;
      }

      throw new InvalidFileContentError(
        DomainExceptionCode.UnsupportedMediaType,
        'Image content is invalid or unreadable.',
      );
    }
  }

  private validateText(bytes: Uint8Array): void {
    let text: string;

    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new InvalidFileContentError(
        DomainExceptionCode.UnsupportedMediaType,
        'Text file is not valid UTF-8.',
      );
    }

    for (const character of text) {
      const codePoint = character.codePointAt(0);
      const isBinaryControlCharacter =
        codePoint === 0 ||
        (codePoint !== undefined &&
          ((codePoint < 32 &&
            codePoint !== 9 &&
            codePoint !== 10 &&
            codePoint !== 13) ||
            codePoint === 127));

      if (isBinaryControlCharacter) {
        throw new InvalidFileContentError(
          DomainExceptionCode.UnsupportedMediaType,
          'Text file contains binary data.',
        );
      }
    }
  }

  private async reject(
    file: FileEntity,
    code: DomainExceptionCode,
    message: string,
  ): Promise<never> {
    file.markRejected();
    await this.fileRepository.save(file);
    await this.storageAdapter.deleteObject(file.s3Key);

    throw new DomainException({
      code,
      message,
      extensions: [{ field: 'fileId', message }],
    });
  }

  private notFound(): DomainException {
    return new DomainException({
      code: DomainExceptionCode.NotFound,
      message: 'File or uploaded object was not found.',
      extensions: [
        {
          field: 'fileId',
          message: 'File or uploaded object was not found.',
        },
      ],
    });
  }
}
