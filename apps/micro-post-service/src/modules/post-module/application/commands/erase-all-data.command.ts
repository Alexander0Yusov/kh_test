import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PostRepository } from '../contracts/post.repository';

export class EraseAllDataCommand {}

@CommandHandler(EraseAllDataCommand)
export class EraseAllDataHandler implements ICommandHandler<
  EraseAllDataCommand,
  void
> {
  public constructor(private readonly postRepository: PostRepository) {}

  public async execute(): Promise<void> {
    await this.postRepository.deleteAllPostsAndUsers();
  }
}
