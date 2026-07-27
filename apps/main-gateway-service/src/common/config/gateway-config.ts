import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { configValidationUtility } from '../../../../../libs/common/src/config/config-validation.utility';

@Injectable()
export class GatewayConfig {
  @IsNumber({}, { message: 'Env variable PORT must be a number' })
  @IsNotEmpty({ message: 'Set Env variable PORT, example: 3000' })
  port: number;

  @IsString({ message: 'Env variable FRONTEND_URL must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable FRONTEND_URL, example: https://inctagram.com',
  })
  frontEndUrl: string;

  constructor(
    private readonly configService: ConfigService<Record<string, string>, true>,
  ) {
    this.port = Number(this.configService.get('PORT'));
    this.frontEndUrl = this.configService.get('FRONTEND_URL');

    configValidationUtility.validateConfig(this);
  }
}
