import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type CreateFileUploadResult,
  FilesClient,
} from '../contracts/files.client';

export type CreateUploadResult = CreateFileUploadResult;

export class CreateUploadCommand extends Command<CreateUploadResult> {
  public constructor(
    public readonly fileExtension: string,
    public readonly fileSize: number,
  ) {
    super();
  }
}

@CommandHandler(CreateUploadCommand)
export class CreateUploadHandler implements ICommandHandler<
  CreateUploadCommand,
  CreateUploadResult
> {
  public constructor(private readonly filesClient: FilesClient) {}

  public execute(command: CreateUploadCommand): Promise<CreateUploadResult> {
    return this.filesClient.createUpload({
      fileExtension: command.fileExtension,
      fileSize: command.fileSize,
    });
  }
}
