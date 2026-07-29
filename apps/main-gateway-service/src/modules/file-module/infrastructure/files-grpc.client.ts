import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { type ServiceError } from '@grpc/grpc-js';
import { type ClientGrpc } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { grpcErrorToDomainException } from '../../../../../../libs/bootstrap/src';
import {
  type EnsureFileUploadedRequest,
  type GetFilesRequest,
  type CreateUploadRequest,
  FILES_SERVICE_NAME,
  type FilesServiceClient,
} from '../../../../../../libs/contracts/src';
import { DomainException } from '../../../../../../libs/common/src/exceptions';
import {
  type CreateFileUploadRequest,
  type CreateFileUploadResult,
  FilesClient,
  type GetFilesResult,
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

  public async ensureUploaded(fileId: string): Promise<void> {
    const request: EnsureFileUploadedRequest = { fileId };

    await firstValueFrom(
      this.filesService.ensureFileUploaded(request).pipe(
        catchError((error: ServiceError) => {
          const exception = grpcErrorToDomainException(error);

          return throwError(
            () =>
              new DomainException({
                code: exception.code,
                message: exception.message,
                extensions: exception.extensions.map((extension) => ({
                  field:
                    extension.field === 'fileId'
                      ? 'avatarFileId'
                      : extension.field,
                  message: extension.message,
                })),
              }),
          );
        }),
      ),
    );
  }

  public async getFiles(fileIds: string[]): Promise<GetFilesResult> {
    const request: GetFilesRequest = { fileIds };
    const response = await firstValueFrom(
      this.filesService
        .getFiles(request)
        .pipe(
          catchError((error: ServiceError) =>
            throwError(() => grpcErrorToDomainException(error)),
          ),
        ),
    );

    return response.files.flatMap((file) =>
      file.publicUrl === undefined
        ? []
        : [{ fileId: file.fileId, publicUrl: file.publicUrl }],
    );
  }
}
