import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import { configValidationUtility } from './config-validation.utility';

@Injectable()
export class CoreConfig {
  @IsString({ message: 'Env variable NODE_ENV must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable NODE_ENV, example: development',
  })
  nodeEnv: string;

  @IsString({ message: 'Env variable RABBITMQ_URL must be a string' })
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
}
