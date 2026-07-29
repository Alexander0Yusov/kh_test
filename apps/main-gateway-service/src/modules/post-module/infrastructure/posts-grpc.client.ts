import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ServiceError } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { grpcErrorToDomainException } from '../../../../../../libs/bootstrap/src';
import {
  POSTS_SERVICE_NAME,
  type PostsServiceClient,
} from '../../../../../../libs/contracts/src';
import { PostsClient } from '../application/contracts/posts.client';

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
