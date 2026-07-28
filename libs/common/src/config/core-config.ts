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
}
