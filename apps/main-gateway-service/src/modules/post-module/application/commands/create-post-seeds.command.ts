import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { PostsClient } from '../contracts/posts.client';
import { UserRepository } from '../../../user-module/application/contracts/user.repository';

const SEED_POSTS_COUNT = 60;
const CREATION_DELAY_MS = 50;

type SeedPostData = {
  userName: string;
  email: string;
  message: string;
};

export class CreatePostSeedsCommand {
  public constructor(public readonly userId: string) {}
}

export type CreatePostSeedsResult = {
  createdCount: number;
};

@CommandHandler(CreatePostSeedsCommand)
export class CreatePostSeedsHandler implements ICommandHandler<
  CreatePostSeedsCommand,
  CreatePostSeedsResult
> {
  public constructor(
    private readonly postsClient: PostsClient,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    command: CreatePostSeedsCommand,
  ): Promise<CreatePostSeedsResult> {
    const user = await this.userRepository.findById(command.userId);

    if (user === null) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Post author data is unavailable.',
      });
    }

    let createdCount = 0;

    for (let index = 1; index <= SEED_POSTS_COUNT; index += 1) {
      const seedPost = this.buildSeedPost(index);

      await this.postsClient.createPost({
        userId: command.userId,
        userName: seedPost.userName,
        email: seedPost.email,
        homePage: null,
        message: seedPost.message,
        attachmentFileId: null,
        parentId: null,
      });

      createdCount += 1;

      if (index < SEED_POSTS_COUNT) {
        await this.delay(CREATION_DELAY_MS);
      }
    }

    return {
      createdCount,
    };
  }

  private buildSeedPost(index: number): SeedPostData {
    const number = String(index).padStart(3, '0');
    const userNameGroup = this.getSeedGroup(index);
    const emailGroup = this.getEmailGroup(userNameGroup);

    return {
      userName: `${userNameGroup}User${number}`,
      email: `${emailGroup}${number}@example.com`,
      message: `Seed message #${number}`,
    };
  }

  private getEmailGroup(userNameGroup: 'A' | 'B' | 'C'): 'a' | 'b' | 'c' {
    switch (userNameGroup) {
      case 'A':
        return 'c';
      case 'B':
        return 'a';
      case 'C':
        return 'b';
    }
  }

  private getSeedGroup(index: number): 'A' | 'B' | 'C' {
    if (index <= 25) {
      return 'A';
    }

    if (index <= 50) {
      return 'B';
    }

    return 'C';
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
