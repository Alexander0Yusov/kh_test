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
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { CoreConfig } from '../../../../libs/common/src/config/core-config';
import { RedisModule } from '../common/redis/redis.module';

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
    RedisModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [GatewayConfigModule],
      inject: [CoreConfig],
      useFactory: (config: CoreConfig): ApolloDriverConfig => ({
        driver: ApolloDriver,
        path: 'graphql',
        useGlobalPrefix: true,
        autoSchemaFile: true,
        sortSchema: true,
        playground: false,
        introspection: config.nodeEnv !== 'production',
        includeStacktraceInErrorResponses: false,
      }),
    }),
    UserModule,
    FileModule,
    PostModule,
    MaintenanceModule,
  ],
  controllers: [],
  providers: [GatewayLifecycleLogger],
})
export class AppModule {}
