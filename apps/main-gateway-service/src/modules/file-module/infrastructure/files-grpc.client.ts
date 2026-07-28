import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { type ServiceError } from '@grpc/grpc-js';
import { type ClientGrpc } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { grpcErrorToDomainException } from '../../../../../../libs/bootstrap/src';
import {
  type CreateUploadRequest,
  FILES_SERVICE_NAME,
  type FilesServiceClient,
} from '../../../../../../libs/contracts/src';
import {
  type CreateFileUploadRequest,
  type CreateFileUploadResult,
  FilesClient,
} from '../application/contracts/files.client';

@Injectable()
export class FilesGrpcClient extends FilesClient implements OnModuleInit {
  private filesService!: FilesServiceClient;

  public constructor(
    @Inject(FILES_SERVICE_NAME) private readonly client: ClientGrpc,
  ) {
    super();
  }

  public onModuleInit(): void {
    this.filesService =
      this.client.getService<FilesServiceClient>(FILES_SERVICE_NAME);
  }

  public createUpload(
    request: CreateFileUploadRequest,
  ): Promise<CreateFileUploadResult> {
    const grpcRequest: CreateUploadRequest = {
      fileExtension: request.fileExtension,
      fileSize: request.fileSize,
    };

    return firstValueFrom(
      this.filesService
        .createUpload(grpcRequest)
        .pipe(
          catchError((error: ServiceError) =>
            throwError(() => grpcErrorToDomainException(error)),
          ),
        ),
    );
  }
}
