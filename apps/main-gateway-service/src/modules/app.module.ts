import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../common/config/gateway-config.module';
import { UserModule } from './user-module';

@Module({
  imports: [GatewayConfigModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
