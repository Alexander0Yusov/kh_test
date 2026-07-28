import { Module } from '@nestjs/common';
import { FilesConfigModule } from '../common/config/files-config.module';
import { FileModule } from './file-module/file.module';

@Module({
  imports: [FilesConfigModule, FileModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
