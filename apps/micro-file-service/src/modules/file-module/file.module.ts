import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { FileRepository } from './application/contracts/file.repository';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: FileRepository,
      useClass: PrismaFileRepository,
    },
  ],
})
export class FileModule {}
