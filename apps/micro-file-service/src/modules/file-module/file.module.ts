import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../common/prisma';
import { RabbitMqPublisher } from '../../common/rabbitmq/rabbitmq.publisher';
import { CreateUploadHandler } from './application/commands/create-upload.command';
import { ProcessUploadedFileHandler } from './application/commands/process-uploaded-file.command';
import { MarkFileUsedHandler } from './application/commands/mark-file-used.command';
import { EnsureFileUploadedHandler } from './application/queries/ensure-file-uploaded.query';
import { GetFilesHandler } from './application/queries/get-files.query';
import { FileRepository } from './application/contracts/file.repository';
import { FileEventsPublisher } from './application/contracts/file-events.publisher';
import { StorageAdapter } from './application/contracts/storage.adapter';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';
import { SqsStorageEventsConsumer } from './infrastructure/sqs/sqs-storage-events.consumer';
import { S3StorageAdapter } from './infrastructure/storage/s3-storage.adapter';
import { FilesGrpcController } from './presentation/grpc/files-grpc.controller';
import { UserCreatedConsumer } from './presentation/rabbitmq/user-created.consumer';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [FilesGrpcController, UserCreatedConsumer],
  providers: [
    CreateUploadHandler,
    ProcessUploadedFileHandler,
    MarkFileUsedHandler,
    EnsureFileUploadedHandler,
    GetFilesHandler,
    SqsStorageEventsConsumer,
    {
      provide: FileRepository,
      useClass: PrismaFileRepository,
    },
    {
      provide: StorageAdapter,
      useClass: S3StorageAdapter,
    },
    {
      provide: FileEventsPublisher,
      useClass: RabbitMqPublisher,
    },
  ],
})
export class FileModule {}
