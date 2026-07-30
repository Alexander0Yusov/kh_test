import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { configValidationUtility } from '../../../../../libs/common/src/config/config-validation.utility';

@Injectable()
export class GatewayConfig {
  @IsNumber({}, { message: 'Env variable PORT must be a number' })
  @IsNotEmpty({ message: 'Set Env variable PORT, example: 3000' })
  port: number;

  @IsString({ message: 'Env variable FRONTEND_URL must be a string' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { message: 'Env variable FRONTEND_URL must be a valid URL' },
  )
  @IsNotEmpty({
    message: 'Set Env variable FRONTEND_URL, example: https://inctagram.com',
  })
  frontEndUrl: string;

  @IsString({ message: 'Env variable PRISMA_DB_URL must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable PRISMA_DB_URL, example: postgresql://...',
  })
  prismaDbUrl: string;

  @IsString({ message: 'Env variable JWT_ACCESS_SECRET must be a string' })
  @IsNotEmpty({ message: 'Set Env variable JWT_ACCESS_SECRET' })
  jwtAccessSecret: string;

  @IsString({ message: 'Env variable JWT_REFRESH_SECRET must be a string' })
  @IsNotEmpty({ message: 'Set Env variable JWT_REFRESH_SECRET' })
  jwtRefreshSecret: string;

  @IsInt({ message: 'Env variable JWT_ACCESS_TTL_SECONDS must be an integer' })
  @IsPositive({
    message: 'Env variable JWT_ACCESS_TTL_SECONDS must be positive',
  })
  jwtAccessTtlSeconds: number;

  @IsInt({
    message: 'Env variable JWT_REFRESH_TTL_SECONDS must be an integer',
  })
  @IsPositive({
    message: 'Env variable JWT_REFRESH_TTL_SECONDS must be positive',
  })
  jwtRefreshTtlSeconds: number;

  @IsString({ message: 'Env variable FILE_SERVICE_GRPC_URL must be a string' })
  @IsNotEmpty({ message: 'Set Env variable FILE_SERVICE_GRPC_URL' })
  fileServiceGrpcUrl: string;

  @IsString({ message: 'Env variable POST_SERVICE_GRPC_URL must be a string' })
  @IsNotEmpty({ message: 'Set Env variable POST_SERVICE_GRPC_URL' })
  postServiceGrpcUrl: string;

  @IsBoolean({ message: 'Env variable SWAGGER_ENABLED must be a boolean' })
  swaggerEnabled: boolean;

  constructor(
    private readonly configService: ConfigService<Record<string, string>, true>,
  ) {
    this.port = Number(this.configService.get('PORT'));
    this.frontEndUrl = this.configService.get('FRONTEND_URL');
    this.prismaDbUrl = this.configService.get('PRISMA_DB_URL');
    this.jwtAccessSecret = this.configService.get('JWT_ACCESS_SECRET');
    this.jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');
    this.jwtAccessTtlSeconds = Number(
      this.configService.get('JWT_ACCESS_TTL_SECONDS'),
    );
    this.jwtRefreshTtlSeconds = Number(
      this.configService.get('JWT_REFRESH_TTL_SECONDS'),
    );
    this.fileServiceGrpcUrl = this.configService.get('FILE_SERVICE_GRPC_URL');
    this.postServiceGrpcUrl = this.configService.get('POST_SERVICE_GRPC_URL');
    this.swaggerEnabled = configValidationUtility.convertToBoolean(
      this.configService.get('SWAGGER_ENABLED'),
    )!;

    configValidationUtility.validateConfig(this);
  }
}
