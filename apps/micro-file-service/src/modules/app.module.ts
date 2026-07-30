import {
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { FilesConfigModule } from '../common/config/files-config.module';
import { FileModule } from './file-module/file.module';

@Injectable()
class FileServiceLifecycleLogger
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(FileServiceLifecycleLogger.name);

  public onApplicationBootstrap(): void {
    this.logger.log('File Service started');
  }

  public onApplicationShutdown(): void {
    this.logger.log('File Service stopped');
  }
}

@Module({
  imports: [FilesConfigModule, FileModule],
  controllers: [],
  providers: [FileServiceLifecycleLogger],
})
export class AppModule {}
