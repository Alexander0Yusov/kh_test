import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { UserRepository } from '../../../user-module/application/contracts/user.repository';

export class EraseAllDataCommand {}

@CommandHandler(EraseAllDataCommand)
export class EraseAllDataHandler implements ICommandHandler<
  EraseAllDataCommand,
  void
> {
  public constructor(
    private readonly filesClient: FilesClient,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(): Promise<void> {
    await this.filesClient.eraseAllData();
    await this.userRepository.deleteAllUsersAndSessions();
  }
}
