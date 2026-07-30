import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { PostsClient } from '../../../post-module/application/contracts/posts.client';
import { UserRepository } from '../../../user-module/application/contracts/user.repository';
import { CaptchaService } from '../../../post-module/application/queries/get-captcha.query';

export class EraseAllDataCommand {}

@CommandHandler(EraseAllDataCommand)
export class EraseAllDataHandler implements ICommandHandler<
  EraseAllDataCommand,
  void
> {
  public constructor(
    private readonly filesClient: FilesClient,
    private readonly postsClient: PostsClient,
    private readonly userRepository: UserRepository,
    private readonly captchaService: CaptchaService,
  ) {}

  public async execute(): Promise<void> {
    await this.filesClient.eraseAllData();
    await this.postsClient.eraseAllData();
    await this.userRepository.deleteAllUsersAndSessions();
    await this.captchaService.clearAll();
  }
}
