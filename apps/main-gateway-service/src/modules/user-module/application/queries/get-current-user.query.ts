import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { UserRepository } from '../contracts/user.repository';

export class GetCurrentUserQuery {
  public constructor(public readonly userId: string) {}
}

export type GetCurrentUserResult = {
  id: string;
  email: string;
  userName: string;
  homePage: string;
  avatarUrl: string;
};

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<
  GetCurrentUserQuery,
  GetCurrentUserResult
> {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly filesClient: FilesClient,
  ) {}

  public async execute(
    query: GetCurrentUserQuery,
  ): Promise<GetCurrentUserResult> {
    const user = await this.userRepository.findById(query.userId);

    if (user === null) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User was not found.',
      });
    }

    const files = await this.filesClient.getFiles([user.avatarFileId]);
    const file = files.find(({ fileId }) => fileId === user.avatarFileId);

    if (file === undefined) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Avatar file was not found.',
      });
    }

    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      homePage: user.homePage,
      avatarUrl: file.publicUrl,
    };
  }
}
