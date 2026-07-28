import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../common/config/gateway-config.module';
import { FileModule } from './file-module/file.module';
import { UserModule } from './user-module';

@Module({
  imports: [GatewayConfigModule, UserModule, FileModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
