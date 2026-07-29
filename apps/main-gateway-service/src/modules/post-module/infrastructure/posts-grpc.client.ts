import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ServiceError } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { grpcErrorToDomainException } from '../../../../../../libs/bootstrap/src';
import {
  type CreatePostRequest as GrpcCreatePostRequest,
  PostOptionalField as GrpcPostOptionalField,
  POSTS_SERVICE_NAME,
  RootPostSortBy as GrpcRootPostSortBy,
  SortDirection as GrpcSortDirection,
  type PostsServiceClient,
} from '../../../../../../libs/contracts/src';
import {
  type CreatePostRequest,
  type CreatePostResult,
  type GetRootPostsInput,
  type GetRootPostsResult,
  type PostOptionalField,
  type PostTreeItem,
  PostsClient,
} from '../application/contracts/posts.client';

@Injectable()
export class PostsGrpcClient extends PostsClient implements OnModuleInit {
  private postsService!: PostsServiceClient;

  public constructor(
    @Inject(POSTS_SERVICE_NAME) private readonly client: ClientGrpc,
  ) {
    super();
  }

  public async getRootPosts(
    input: GetRootPostsInput,
  ): Promise<GetRootPostsResult> {
    const response = await firstValueFrom(
      this.postsService
        .getRootPosts({
          cursor: input.cursor,
          sortBy:
            input.sortBy === undefined ? undefined : toGrpcSortBy(input.sortBy),
          sortDirection:
            input.sortDirection === undefined
              ? undefined
              : toGrpcSortDirection(input.sortDirection),
          limit: input.limit,
          fields:
            input.fields === undefined
              ? undefined
              : { values: input.fields.map(toGrpcOptionalField) },
        })
        .pipe(
          catchError((error: ServiceError) =>
            throwError(() => grpcErrorToDomainException(error)),
          ),
        ),
    );

    return {
      rootIds: response.rootIds ?? [],
      nextCursor: response.nextCursor,
      hasMore: response.hasMore,
      resolvedFields: (response.resolvedFields ?? []).map(
        fromGrpcOptionalField,
      ),
    };
  }

  public async getPostsByRootIds(rootIds: string[]): Promise<PostTreeItem[]> {
    const response = await firstValueFrom(
      this.postsService
        .getPostsByRootIds({ rootIds })
        .pipe(
          catchError((error: ServiceError) =>
            throwError(() => grpcErrorToDomainException(error)),
          ),
        ),
    );

    return (response.posts ?? []).map((post) => {
      if (post.createdAt === undefined) {
        throw new Error('Posts Service returned no creation timestamp.');
      }

      return {
        id: post.id,
        userId: post.userId,
        parentId: post.parentId ?? null,
        rootId: post.rootId ?? null,
        path: post.path,
        message: post.message,
        attachmentFileId: post.attachmentFileId ?? null,
        createdAt: new Date(
          post.createdAt.seconds * 1000 +
            Math.floor(post.createdAt.nanos / 1_000_000),
        ),
      };
    });
  }

  public onModuleInit(): void {
    this.postsService =
      this.client.getService<PostsServiceClient>(POSTS_SERVICE_NAME);
  }

  public async createPost(
    request: CreatePostRequest,
  ): Promise<CreatePostResult> {
    const grpcRequest: GrpcCreatePostRequest = {
      userId: request.userId,
      message: request.message,
      attachmentFileId: request.attachmentFileId ?? undefined,
      parentId: request.parentId ?? undefined,
    };
    const post = await firstValueFrom(
      this.postsService
        .createPost(grpcRequest)
        .pipe(
          catchError((error: ServiceError) =>
            throwError(() => grpcErrorToDomainException(error)),
          ),
        ),
    );

    if (post.createdAt === undefined) {
      throw new Error('Posts Service returned no creation timestamp.');
    }

    return {
      id: post.id,
      parentId: post.parentId ?? null,
      message: post.message,
      attachmentFileId: post.attachmentFileId ?? null,
      createdAt: new Date(
        post.createdAt.seconds * 1000 +
          Math.floor(post.createdAt.nanos / 1_000_000),
      ),
    };
  }

  public async eraseAllData(): Promise<void> {
    await firstValueFrom(
      this.postsService
        .eraseAllData({})
        .pipe(
          catchError((error: ServiceError) =>
            throwError(() => grpcErrorToDomainException(error)),
          ),
        ),
    );
  }
}

function toGrpcSortBy(value: GetRootPostsInput['sortBy']): GrpcRootPostSortBy {
  switch (value) {
    case 'createdAt':
      return GrpcRootPostSortBy.ROOT_POST_SORT_BY_CREATED_AT;
    case 'userName':
      return GrpcRootPostSortBy.ROOT_POST_SORT_BY_USER_NAME;
    case 'email':
      return GrpcRootPostSortBy.ROOT_POST_SORT_BY_EMAIL;
    case undefined:
      throw new Error('sortBy is required.');
  }
}

function toGrpcSortDirection(
  value: GetRootPostsInput['sortDirection'],
): GrpcSortDirection {
  switch (value) {
    case 'asc':
      return GrpcSortDirection.SORT_DIRECTION_ASC;
    case 'desc':
      return GrpcSortDirection.SORT_DIRECTION_DESC;
    case undefined:
      throw new Error('sortDirection is required.');
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

function fromGrpcOptionalField(
  value: GrpcPostOptionalField,
): PostOptionalField {
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
      throw new Error('Posts Service returned an unsupported optional field.');
  }
}
