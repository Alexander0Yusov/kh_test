import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../common/prisma';
import { CreateUploadHandler } from './application/commands/create-upload.command';
import { ProcessUploadedFileHandler } from './application/commands/process-uploaded-file.command';
import { FileRepository } from './application/contracts/file.repository';
import { StorageAdapter } from './application/contracts/storage.adapter';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';
import { S3StorageAdapter } from './infrastructure/storage/s3-storage.adapter';
import { FilesGrpcController } from './presentation/grpc/files-grpc.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [FilesGrpcController],
  providers: [
    CreateUploadHandler,
    ProcessUploadedFileHandler,
    {
      provide: FileRepository,
      useClass: PrismaFileRepository,
    },
    {
      provide: StorageAdapter,
      useClass: S3StorageAdapter,
    },
  ],
})
export class FileModule {}
