import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { configValidationUtility } from './config-validation.utility';

@Injectable()
export class CoreConfig {
  @IsString({ message: 'Env variable NODE_ENV must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable NODE_ENV, example: development',
  })
  nodeEnv: string;

  @IsString({ message: 'Env variable RABBITMQ_URL must be a string' })
  @IsUrl(
    {
      protocols: ['amqp', 'amqps'],
      require_protocol: true,
    },
    { message: 'Env variable RABBITMQ_URL must be a valid AMQP URL' },
  )
  @IsNotEmpty({
    message: 'Set Env variable RABBITMQ_URL, example: amqp://localhost:5672',
  })
  rabbitmqUrl: string;

  constructor(
    private readonly configService: ConfigService<Record<string, string>, true>,
  ) {
    this.nodeEnv = this.configService.get('NODE_ENV');
    this.rabbitmqUrl = this.configService.get('RABBITMQ_URL');

    configValidationUtility.validateConfig(this);
  }

  public get rabbitMqExchange(): string {
    switch (this.nodeEnv) {
      case 'development':
        return 'topic-exchange.dev';
      case 'testing':
        return 'topic-exchange.test';
      case 'production':
        return 'topic-exchange.prod';
      default:
        throw new Error(`Unsupported NODE_ENV value: ${this.nodeEnv}`);
    }
  }

  public get rabbitMqGatewayFilesQueue(): string {
    switch (this.nodeEnv) {
      case 'development':
        return 'gateway.files-events.dev';
      case 'testing':
        return 'gateway.files-events.test';
      case 'production':
        return 'gateway.files-events.prod';
      default:
        throw new Error(`Unsupported NODE_ENV value: ${this.nodeEnv}`);
    }
  }

  public get rabbitMqGatewayPostsQueue(): string {
    switch (this.nodeEnv) {
      case 'development':
        return 'gateway.posts-events.dev';
      case 'testing':
        return 'gateway.posts-events.test';
      case 'production':
        return 'gateway.posts-events.prod';
      default:
        throw new Error(`Unsupported NODE_ENV value: ${this.nodeEnv}`);
    }
  }

  public get rabbitMqFilesUserEventsQueue(): string {
    switch (this.nodeEnv) {
      case 'development':
        return 'files.user-events.dev';
      case 'testing':
        return 'files.user-events.test';
      case 'production':
        return 'files.user-events.prod';
      default:
        throw new Error(`Unsupported NODE_ENV value: ${this.nodeEnv}`);
    }
  }

  public get rabbitMqPostsUserEventsQueue(): string {
    switch (this.nodeEnv) {
      case 'development':
        return 'posts.user-events.dev';
      case 'testing':
        return 'posts.user-events.test';
      case 'production':
        return 'posts.user-events.prod';
      default:
        throw new Error(`Unsupported NODE_ENV value: ${this.nodeEnv}`);
    }
  }

  public get rabbitMqFilesPostEventsQueue(): string {
    switch (this.nodeEnv) {
      case 'development':
        return 'files.post-events.dev';
      case 'testing':
        return 'files.post-events.test';
      case 'production':
        return 'files.post-events.prod';
      default:
        throw new Error(`Unsupported NODE_ENV value: ${this.nodeEnv}`);
    }
  }
}
