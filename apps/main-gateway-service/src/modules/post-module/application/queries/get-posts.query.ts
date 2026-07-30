import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { UserRepository } from '../../../user-module/application/contracts/user.repository';
import type { UserEntity } from '../../../user-module/domain';
import {
  type GetRootPostsInput,
  type PostOptionalField,
  type PostTreeItem,
  PostsClient,
  type RootPostSortBy,
  type SortDirection,
} from '../contracts/posts.client';

export class GetPostsQuery {
  public constructor(
    public readonly cursor?: string,
    public readonly sortBy?: RootPostSortBy,
    public readonly sortDirection?: SortDirection,
    public readonly limit?: number,
    public readonly fields?: PostOptionalField[],
  ) {}
}

export type GetPostsItem = {
  id: string;
  parentId: string | null;
  rootId: string | null;
  path: string;
  message: string;
  publishDate?: Date;
  userName: string;
  email?: string;
  homePage?: string | null;
  avatarUrl?: string | null;
  attachmentUrl?: string | null;
};

export type GetPostsResult = {
  items: GetPostsItem[];
  nextCursor: string | null;
  hasMore: boolean;
  fields: PostOptionalField[];
};

export const FULL_POST_FIELDS: PostOptionalField[] = [
  'avatar',
  'userName',
  'email',
  'homePage',
  'publishDate',
  'attachment',
];

@QueryHandler(GetPostsQuery)
export class GetPostsHandler implements IQueryHandler<
  GetPostsQuery,
  GetPostsResult
> {
  public constructor(
    private readonly postsClient: PostsClient,
    private readonly userRepository: UserRepository,
    private readonly filesClient: FilesClient,
  ) {}

  public async execute(query: GetPostsQuery): Promise<GetPostsResult> {
    const rootPage = await this.postsClient.getRootPosts(
      this.toRootPostsInput(query),
    );

    if (rootPage.rootIds.length === 0) {
      return {
        items: [],
        nextCursor: rootPage.nextCursor ?? null,
        hasMore: rootPage.hasMore,
        fields: publicOptionalFields(rootPage.resolvedFields),
      };
    }

    const posts = await this.postsClient.getPostsByRootIds(rootPage.rootIds);
    const fields = new Set(rootPage.resolvedFields);
    const needsUsers = fields.has('avatar');
    const userIds = [...new Set(posts.map(({ userId }) => userId))];
    const users = needsUsers
      ? await this.userRepository.findManyByIds(userIds)
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    const fileIds = new Set<string>();

    if (fields.has('avatar')) {
      for (const user of users) {
        fileIds.add(user.avatarFileId);
      }
    }

    if (fields.has('attachment')) {
      for (const post of posts) {
        if (post.attachmentFileId !== null) {
          fileIds.add(post.attachmentFileId);
        }
      }
    }

    const files =
      fileIds.size === 0 ? [] : await this.filesClient.getFiles([...fileIds]);
    const urlsByFileId = new Map(
      files.map((file) => [file.fileId, file.publicUrl]),
    );

    return {
      items: posts.map((post) => {
        const user = needsUsers ? usersById.get(post.userId) : undefined;

        if (needsUsers && user === undefined) {
          throw missingUserException();
        }

        return buildPostResponse(post, user, urlsByFileId, fields);
      }),
      nextCursor: rootPage.nextCursor ?? null,
      hasMore: rootPage.hasMore,
      fields: publicOptionalFields(rootPage.resolvedFields),
    };
  }

  private toRootPostsInput(query: GetPostsQuery): GetRootPostsInput {
    return {
      cursor: query.cursor,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      limit: query.limit,
      fields:
        query.fields === undefined
          ? undefined
          : [...new Set<PostOptionalField>(['userName', ...query.fields])],
    };
  }
}

export function buildPostResponse(
  post: PostTreeItem,
  user: UserEntity | undefined,
  urlsByFileId: ReadonlyMap<string, string>,
  fields: ReadonlySet<PostOptionalField>,
): GetPostsItem {
  return {
    id: post.id,
    parentId: post.parentId,
    rootId: post.rootId,
    path: post.path,
    message: post.message,
    userName: post.userName,
    ...(fields.has('publishDate') ? { publishDate: post.createdAt } : {}),
    ...(fields.has('email') ? { email: post.email } : {}),
    ...(fields.has('homePage') ? { homePage: post.homePage } : {}),
    ...(fields.has('avatar')
      ? {
          avatarUrl:
            user === undefined
              ? null
              : (urlsByFileId.get(user.avatarFileId) ?? null),
        }
      : {}),
    ...(fields.has('attachment')
      ? {
          attachmentUrl:
            post.attachmentFileId === null
              ? null
              : (urlsByFileId.get(post.attachmentFileId) ?? null),
        }
      : {}),
  };
}

function publicOptionalFields(
  fields: PostOptionalField[],
): PostOptionalField[] {
  return fields.filter((field) => field !== 'userName');
}

function missingUserException(): DomainException {
  return new DomainException({
    code: DomainExceptionCode.InvalidBusinessState,
    message: 'Post author data is unavailable.',
    extensions: [
      { field: 'userId', message: 'Post author data is unavailable.' },
    ],
  });
}
