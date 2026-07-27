import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConfig } from '../../../../../libs/common/src/config/core-config';
import { GatewayConfig } from './gateway-config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
  ],
  providers: [CoreConfig, GatewayConfig],
  exports: [CoreConfig, GatewayConfig],
})
export class GatewayConfigModule {}
