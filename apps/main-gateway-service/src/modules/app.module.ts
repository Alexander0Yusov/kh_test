import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../common/config/gateway-config.module';
import { PrismaModule } from '../common/prisma';

@Module({
  imports: [GatewayConfigModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
