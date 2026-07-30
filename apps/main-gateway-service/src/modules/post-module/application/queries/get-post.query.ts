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
import type { PostOptionalField } from '../contracts/posts.client';

export class GetPostQuery {
  public constructor(
    public readonly postId: string,
    public readonly fields: PostOptionalField[] = FULL_POST_FIELDS,
  ) {}
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
    const fields = new Set<PostOptionalField>(['userName', ...query.fields]);
    const user = fields.has('avatar')
      ? await this.userRepository.findById(post.userId)
      : undefined;

    if (fields.has('avatar') && (user === null || user === undefined)) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Post author data is unavailable.',
        extensions: [
          { field: 'userId', message: 'Post author data is unavailable.' },
        ],
      });
    }
    const resolvedUser = user ?? undefined;

    const fileIds = new Set<string>();
    if (fields.has('avatar') && resolvedUser !== undefined) {
      fileIds.add(resolvedUser.avatarFileId);
    }
    if (fields.has('attachment') && post.attachmentFileId !== null) {
      fileIds.add(post.attachmentFileId);
    }
    const files =
      fileIds.size === 0 ? [] : await this.filesClient.getFiles([...fileIds]);
    const urlsByFileId = new Map(
      files.map((file) => [file.fileId, file.publicUrl]),
    );

    return buildPostResponse(post, resolvedUser, urlsByFileId, fields);
  }
}
