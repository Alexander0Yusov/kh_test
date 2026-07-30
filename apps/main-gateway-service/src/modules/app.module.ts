import {
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { GatewayConfigModule } from '../common/config/gateway-config.module';
import { FileModule } from './file-module/file.module';
import { UserModule } from './user-module';
import { MaintenanceModule } from './maintenance-module/maintenance.module';
import { PostModule } from './post-module/post.module';

@Injectable()
class GatewayLifecycleLogger
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(GatewayLifecycleLogger.name);

  public onApplicationBootstrap(): void {
    this.logger.log('Gateway started');
  }

  public onApplicationShutdown(): void {
    this.logger.log('Gateway stopped');
  }
}

@Module({
  imports: [
    GatewayConfigModule,
    UserModule,
    FileModule,
    PostModule,
    MaintenanceModule,
  ],
  controllers: [],
  providers: [GatewayLifecycleLogger],
})
export class AppModule {}
