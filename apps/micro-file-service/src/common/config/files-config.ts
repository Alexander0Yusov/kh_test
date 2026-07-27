import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { configValidationUtility } from '../../../../../libs/common/src/config/config-validation.utility';

@Injectable()
export class FilesConfig {
  @IsNumber({}, { message: 'Env variable PORT must be a number' })
  @IsNotEmpty({ message: 'Set Env variable PORT, example: 3002' })
  port: number;

  @IsString({ message: 'Env variable DATABASE_URL must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable DATABASE_URL, example: postgresql://...',
  })
  databaseUrl: string;

  constructor(
    private readonly configService: ConfigService<Record<string, string>, true>,
  ) {
    this.port = Number(this.configService.get('PORT'));
    this.databaseUrl = this.configService.get('DATABASE_URL');

    configValidationUtility.validateConfig(this);
  }
}
