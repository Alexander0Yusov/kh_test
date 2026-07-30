import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type CreatePostRequest,
  type Empty,
  type GetRootPostsRequest,
  type GetRootPostsResponse,
  type GetPostsByRootIdsRequest,
  type GetPostsByRootIdsResponse,
  type GetPostRequest,
  PostOptionalField as GrpcPostOptionalField,
  type PostDto,
  POSTS_SERVICE_NAME,
  RootPostSortBy as GrpcRootPostSortBy,
  SortDirection as GrpcSortDirection,
} from '../../../../../../../libs/contracts/src';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import {
  CreatePostCommand,
  type CreatePostResult,
} from '../../application/commands/create-post.command';
import { EraseAllDataCommand } from '../../application/commands/erase-all-data.command';
import {
  GetRootPostsQuery,
  type GetRootPostsResult,
  type PostOptionalField,
} from '../../application/queries/get-root-posts.query';
import {
  GetPostsByRootIdsQuery,
  type GetPostsByRootIdsResult,
} from '../../application/queries/get-posts-by-root-ids.query';
import type {
  RootPostSortBy,
  SortDirection,
} from '../../application/contracts/post-query.repository';
import {
  GetPostQuery,
  type GetPostResult,
} from '../../application/queries/get-post.query';

@Controller()
export class PostsGrpcController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @GrpcMethod(POSTS_SERVICE_NAME, 'CreatePost')
  public async createPost(request: CreatePostRequest): Promise<PostDto> {
    const result = await this.commandBus.execute<
      CreatePostCommand,
      CreatePostResult
    >(
      new CreatePostCommand(
        request.userId,
        request.userName,
        request.email,
        request.homePage ?? null,
        request.message,
        request.attachmentFileId ?? null,
        request.parentId ?? null,
      ),
    );
    const milliseconds = result.createdAt.getTime();

    return {
      id: result.id,
      userId: result.userId,
      userName: result.userName,
      email: result.email,
      homePage: result.homePage ?? undefined,
      parentId: result.parentId ?? undefined,
      rootId: result.rootId ?? undefined,
      path: result.path,
      childCounter: result.childCounter,
      message: result.message,
      attachmentFileId: result.attachmentFileId ?? undefined,
      createdAt: {
        seconds: Math.floor(milliseconds / 1000),
        nanos: (milliseconds % 1000) * 1_000_000,
      },
    };
  }

  @GrpcMethod(POSTS_SERVICE_NAME, 'GetRootPosts')
  public async getRootPosts(
    request: GetRootPostsRequest,
  ): Promise<GetRootPostsResponse> {
    const result = await this.queryBus.execute<
      GetRootPostsQuery,
      GetRootPostsResult
    >(
      new GetRootPostsQuery(
        request.cursor ?? null,
        toSortBy(request.sortBy),
        toSortDirection(request.sortDirection),
        request.limit,
        request.fields === undefined
          ? undefined
          : (request.fields.values ?? []).map(toOptionalField),
      ),
    );

    return {
      rootIds: result.rootIds,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      resolvedFields: result.resolvedFields.map(toGrpcOptionalField),
    };
  }

  @GrpcMethod(POSTS_SERVICE_NAME, 'GetPostsByRootIds')
  public async getPostsByRootIds(
    request: GetPostsByRootIdsRequest,
  ): Promise<GetPostsByRootIdsResponse> {
    const result = await this.queryBus.execute<
      GetPostsByRootIdsQuery,
      GetPostsByRootIdsResult
    >(new GetPostsByRootIdsQuery(request.rootIds ?? []));

    return {
      posts: result.posts.map(toPostDto),
    };
  }

  @GrpcMethod(POSTS_SERVICE_NAME, 'GetPost')
  public async getPost(request: GetPostRequest): Promise<PostDto> {
    const result = await this.queryBus.execute<GetPostQuery, GetPostResult>(
      new GetPostQuery(request.postId),
    );

    return toPostDto(result);
  }

  @GrpcMethod(POSTS_SERVICE_NAME, 'EraseAllData')
  public async eraseAllData(): Promise<Empty> {
    await this.commandBus.execute(new EraseAllDataCommand());
    return {};
  }
}

function toPostDto(post: GetPostResult): PostDto {
  const milliseconds = post.createdAt.getTime();

  return {
    id: post.id,
    userId: post.userId,
    userName: post.userName,
    email: post.email,
    homePage: post.homePage ?? undefined,
    parentId: post.parentId ?? undefined,
    rootId: post.rootId ?? undefined,
    path: post.path,
    childCounter: undefined,
    message: post.message,
    attachmentFileId: post.attachmentFileId ?? undefined,
    createdAt: {
      seconds: Math.floor(milliseconds / 1000),
      nanos: (milliseconds % 1000) * 1_000_000,
    },
  };
}

function toSortBy(value?: GrpcRootPostSortBy): RootPostSortBy | undefined {
  switch (value) {
    case undefined:
      return undefined;
    case GrpcRootPostSortBy.ROOT_POST_SORT_BY_CREATED_AT:
      return 'createdAt';
    case GrpcRootPostSortBy.ROOT_POST_SORT_BY_USER_NAME:
      return 'userName';
    case GrpcRootPostSortBy.ROOT_POST_SORT_BY_EMAIL:
      return 'email';
    default:
      throw validationException('sortBy');
  }
}

function toSortDirection(value?: GrpcSortDirection): SortDirection | undefined {
  switch (value) {
    case undefined:
      return undefined;
    case GrpcSortDirection.SORT_DIRECTION_ASC:
      return 'asc';
    case GrpcSortDirection.SORT_DIRECTION_DESC:
      return 'desc';
    default:
      throw validationException('sortDirection');
  }
}

function toOptionalField(value: GrpcPostOptionalField): PostOptionalField {
  switch (value) {
    case GrpcPostOptionalField.POST_OPTIONAL_FIELD_AVATAR:
      return 'avatar';
    case GrpcPostOptionalField.POST_OPTIONAL_FIELD_USER_NAME:
      return 'userName';
    case GrpcPostOptionalField.POST_OPTIONAL_FIELD_EMAIL:
      return 'email';
    case GrpcPostOptionalField.POST_OPTIONAL_FIELD_HOME_PAGE:
      return 'homePage';
    case GrpcPostOptionalField.POST_OPTIONAL_FIELD_PUBLISH_DATE:
      return 'publishDate';
    case GrpcPostOptionalField.POST_OPTIONAL_FIELD_ATTACHMENT:
      return 'attachment';
    default:
      throw validationException('fields');
  }
}

function toGrpcOptionalField(value: PostOptionalField): GrpcPostOptionalField {
  switch (value) {
    case 'avatar':
      return GrpcPostOptionalField.POST_OPTIONAL_FIELD_AVATAR;
    case 'userName':
      return GrpcPostOptionalField.POST_OPTIONAL_FIELD_USER_NAME;
    case 'email':
      return GrpcPostOptionalField.POST_OPTIONAL_FIELD_EMAIL;
    case 'homePage':
      return GrpcPostOptionalField.POST_OPTIONAL_FIELD_HOME_PAGE;
    case 'publishDate':
      return GrpcPostOptionalField.POST_OPTIONAL_FIELD_PUBLISH_DATE;
    case 'attachment':
      return GrpcPostOptionalField.POST_OPTIONAL_FIELD_ATTACHMENT;
  }
}

function validationException(field: string): DomainException {
  return new DomainException({
    code: DomainExceptionCode.ValidationFailed,
    message: 'Validation failed.',
    extensions: [{ field, message: 'Validation failed.' }],
  });
}
