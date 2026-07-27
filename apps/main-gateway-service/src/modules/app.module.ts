import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../common/config/gateway-config.module';

@Module({
  imports: [GatewayConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
