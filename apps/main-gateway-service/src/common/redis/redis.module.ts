import {
  Global,
  Injectable,
  Logger,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { GatewayConfig } from '../config/gateway-config';
import { GatewayConfigModule } from '../config/gateway-config.module';

const REDIS_CONNECT_TIMEOUT_MS = 1500;
const REDIS_INITIAL_RETRIES = 2;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: RedisClientType;
  private hasConnected = false;
  private isShuttingDown = false;

  public constructor(config: GatewayConfig) {
    this.redisClient = createClient({
      url: config.redisUrl,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries: number): number | Error => {
          if (!this.hasConnected && retries >= REDIS_INITIAL_RETRIES) {
            return new Error('Redis startup connection failed.');
          }

          return Math.min(100 * 2 ** retries, 2000);
        },
      },
    });
    this.redisClient.on('connect', () => {
      this.logger.log('Redis connecting');
    });
    this.redisClient.on('ready', () => {
      this.hasConnected = true;
      this.logger.log('Redis ready');
    });
    this.redisClient.on('reconnecting', () => {
      if (!this.isShuttingDown) {
        this.logger.warn('Redis reconnecting');
      }
    });
    this.redisClient.on('error', () => {
      if (!this.isShuttingDown) {
        this.logger.error('Redis connection error');
      }
    });
    this.redisClient.on('end', () => {
      this.logger.log('Redis connection closed');
    });
  }

  public get client(): RedisClientType {
    return this.redisClient;
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.redisClient.connect();
    } catch {
      if (this.redisClient.isOpen) {
        this.redisClient.destroy();
      }
      throw new Error('Redis is unavailable during Gateway startup.');
    }
  }

  public async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.log('Redis shutting down');
    if (this.redisClient.isOpen) {
      if (this.redisClient.isReady) {
        await this.redisClient.close();
      } else {
        this.redisClient.destroy();
      }
    }
  }
}

@Global()
@Module({
  imports: [GatewayConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
