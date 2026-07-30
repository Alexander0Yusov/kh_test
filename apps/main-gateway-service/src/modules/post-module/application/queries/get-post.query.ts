import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { UserRepository } from '../../../user-module/application/contracts/user.repository';
import { PostsClient } from '../contracts/posts.client';
import {
  buildPostResponse,
  FULL_POST_FIELDS,
  type GetPostsItem,
} from './get-posts.query';

export class GetPostQuery {
  public constructor(public readonly postId: string) {}
}

export type GetPostResult = GetPostsItem;

@QueryHandler(GetPostQuery)
export class GetPostHandler implements IQueryHandler<
  GetPostQuery,
  GetPostResult
> {
  public constructor(
    private readonly postsClient: PostsClient,
    private readonly userRepository: UserRepository,
    private readonly filesClient: FilesClient,
  ) {}

  public async execute(query: GetPostQuery): Promise<GetPostResult> {
    const post = await this.postsClient.getPost(query.postId);
    const user = await this.userRepository.findById(post.userId);

    if (user === null) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Post author data is unavailable.',
        extensions: [
          { field: 'userId', message: 'Post author data is unavailable.' },
        ],
      });
    }

    const fileIds = [
      user.avatarFileId,
      ...(post.attachmentFileId === null ? [] : [post.attachmentFileId]),
    ];
    const files = await this.filesClient.getFiles([...new Set(fileIds)]);
    const urlsByFileId = new Map(
      files.map((file) => [file.fileId, file.publicUrl]),
    );

    return buildPostResponse(
      post,
      user,
      urlsByFileId,
      new Set(FULL_POST_FIELDS),
    );
  }
}
