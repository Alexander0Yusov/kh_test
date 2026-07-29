import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { FileRepository } from '../contracts/file.repository';
import { StorageAdapter } from '../contracts/storage.adapter';

export class EraseAllDataCommand {}

@CommandHandler(EraseAllDataCommand)
export class EraseAllDataHandler implements ICommandHandler<
  EraseAllDataCommand,
  void
> {
  public constructor(
    private readonly storageAdapter: StorageAdapter,
    private readonly fileRepository: FileRepository,
  ) {}

  public async execute(): Promise<void> {
    await this.storageAdapter.deleteAllObjects();
    await this.fileRepository.deleteAll();
  }
}
