import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import { configValidationUtility } from '../../../../../libs/common/src/config/config-validation.utility';

@Injectable()
export class PostsConfig {
  @IsString({ message: 'Env variable PRISMA_DB_URL must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable PRISMA_DB_URL, example: postgresql://...',
  })
  prismaDbUrl: string;

  @IsString({ message: 'Env variable POSTS_GRPC_URL must be a string' })
  @IsNotEmpty({ message: 'Set Env variable POSTS_GRPC_URL' })
  grpcUrl: string;

  constructor(
    private readonly configService: ConfigService<Record<string, string>, true>,
  ) {
    this.prismaDbUrl = this.configService.get('PRISMA_DB_URL');
    this.grpcUrl = this.configService.get('POSTS_GRPC_URL');

    configValidationUtility.validateConfig(this);
  }
}
