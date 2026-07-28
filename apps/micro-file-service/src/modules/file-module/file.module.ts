import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { FileRepository } from './application/contracts/file.repository';
import { StorageAdapter } from './application/contracts/storage.adapter';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';
import { S3StorageAdapter } from './infrastructure/storage/s3-storage.adapter';

@Module({
  imports: [PrismaModule],
  providers: [
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
