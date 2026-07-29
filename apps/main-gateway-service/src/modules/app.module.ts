import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../common/config/gateway-config.module';
import { FileModule } from './file-module/file.module';
import { UserModule } from './user-module';
import { MaintenanceModule } from './maintenance-module/maintenance.module';
import { PostModule } from './post-module/post.module';

@Module({
  imports: [
    GatewayConfigModule,
    UserModule,
    FileModule,
    PostModule,
    MaintenanceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
