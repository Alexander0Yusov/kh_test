import { Module } from '@nestjs/common';
import { FilesConfigModule } from '../common/config/files-config.module';

@Module({
  imports: [FilesConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
