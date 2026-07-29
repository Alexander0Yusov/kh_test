import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { FileStatus } from '../../domain';
import { FileRepository } from '../contracts/file.repository';

export class MarkFileUsedCommand {
  public constructor(public readonly fileId: string) {}
}

export type MarkFileUsedResult = {
  fileId: string;
  status: FileStatus | null;
  changed: boolean;
};

@CommandHandler(MarkFileUsedCommand)
export class MarkFileUsedHandler implements ICommandHandler<
  MarkFileUsedCommand,
  MarkFileUsedResult
> {
  public constructor(private readonly fileRepository: FileRepository) {}

  public async execute(
    command: MarkFileUsedCommand,
  ): Promise<MarkFileUsedResult> {
    const file = await this.fileRepository.findById(command.fileId);

    if (file === null) {
      return { fileId: command.fileId, status: null, changed: false };
    }

    if (file.status !== FileStatus.Uploaded) {
      return { fileId: file.id, status: file.status, changed: false };
    }

    file.markUsed();
    await this.fileRepository.save(file);

    return { fileId: file.id, status: file.status, changed: true };
  }
}
