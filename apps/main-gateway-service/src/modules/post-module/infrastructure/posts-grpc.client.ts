import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ServiceError } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { grpcErrorToDomainException } from '../../../../../../libs/bootstrap/src';
import {
  type CreateRootPostRequest as GrpcCreateRootPostRequest,
  POSTS_SERVICE_NAME,
  type PostsServiceClient,
} from '../../../../../../libs/contracts/src';
import {
  type CreateRootPostRequest,
  type CreateRootPostResult,
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

  public onModuleInit(): void {
    this.postsService =
      this.client.getService<PostsServiceClient>(POSTS_SERVICE_NAME);
  }

  public async createRootPost(
    request: CreateRootPostRequest,
  ): Promise<CreateRootPostResult> {
    const grpcRequest: GrpcCreateRootPostRequest = {
      userId: request.userId,
      message: request.message,
      attachmentFileId: request.attachmentFileId ?? undefined,
    };
    const post = await firstValueFrom(
      this.postsService
        .createRootPost(grpcRequest)
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
