import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type CreateUploadRequest,
  type CreateUploadResponse,
  type EnsureFileUploadedRequest,
  type EnsureFileUploadedResponse,
  type GetFilesRequest,
  type GetFilesResponse,
  FileStatus as GrpcFileStatus,
  FILES_SERVICE_NAME,
} from '../../../../../../../libs/contracts/src';
import { CreateUploadCommand } from '../../application/commands/create-upload.command';
import { EnsureFileUploadedQuery } from '../../application/queries/ensure-file-uploaded.query';
import {
  GetFilesQuery,
  type GetFilesResult,
} from '../../application/queries/get-files.query';
import { FileStatus } from '../../domain';

@Controller()
export class FilesGrpcController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @GrpcMethod(FILES_SERVICE_NAME, 'CreateUpload')
  public createUpload(
    request: CreateUploadRequest,
  ): Promise<CreateUploadResponse> {
    return this.commandBus.execute(
      new CreateUploadCommand(request.fileExtension, request.fileSize),
    );
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'EnsureFileUploaded')
  public ensureFileUploaded(
    request: EnsureFileUploadedRequest,
  ): Promise<EnsureFileUploadedResponse> {
    return this.queryBus.execute(new EnsureFileUploadedQuery(request.fileId));
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'GetFiles')
  public async getFiles(request: GetFilesRequest): Promise<GetFilesResponse> {
    const result = await this.queryBus.execute<GetFilesQuery, GetFilesResult>(
      new GetFilesQuery(request.fileIds),
    );

    return {
      files: result.files.map((file) => ({
        fileId: file.fileId,
        status:
          file.status === FileStatus.Uploaded
            ? GrpcFileStatus.FILE_STATUS_UPLOADED
            : GrpcFileStatus.FILE_STATUS_USED,
        publicUrl: file.publicUrl,
      })),
    };
  }
}
