import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type CreateUploadRequest,
  type CreateUploadResponse,
  FILES_SERVICE_NAME,
} from '../../../../../../../libs/contracts/src';
import { CreateUploadCommand } from '../../application/commands/create-upload.command';

@Controller()
export class FilesGrpcController {
  public constructor(private readonly commandBus: CommandBus) {}

  @GrpcMethod(FILES_SERVICE_NAME, 'CreateUpload')
  public createUpload(
    request: CreateUploadRequest,
  ): Promise<CreateUploadResponse> {
    return this.commandBus.execute(
      new CreateUploadCommand(request.fileExtension, request.fileSize),
    );
  }
}
