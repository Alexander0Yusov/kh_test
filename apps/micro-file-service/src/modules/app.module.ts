import { Module } from '@nestjs/common';
import { FilesConfigModule } from '../common/config/files-config.module';
import { PrismaModule } from '../common/prisma';

@Module({
  imports: [FilesConfigModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
