import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { configValidationUtility } from '../../../../../libs/common/src/config/config-validation.utility';

@Injectable()
export class FilesConfig {
  @IsNumber({}, { message: 'Env variable PORT must be a number' })
  @IsNotEmpty({ message: 'Set Env variable PORT, example: 3002' })
  port: number;

  @IsString({ message: 'Env variable PRISMA_DB_URL must be a string' })
  @IsNotEmpty({
    message: 'Set Env variable PRISMA_DB_URL, example: postgresql://...',
  })
  prismaDbUrl: string;

  @IsString({ message: 'Env variable FILES_STORAGE_ENDPOINT must be a string' })
  @IsNotEmpty({ message: 'Set Env variable FILES_STORAGE_ENDPOINT' })
  filesStorageEndpoint: string;

  @IsString({ message: 'Env variable FILES_STORAGE_REGION must be a string' })
  @IsNotEmpty({ message: 'Set Env variable FILES_STORAGE_REGION' })
  filesStorageRegion: string;

  @IsString({
    message: 'Env variable FILES_STORAGE_ACCESS_KEY must be a string',
  })
  @IsNotEmpty({ message: 'Set Env variable FILES_STORAGE_ACCESS_KEY' })
  filesStorageAccessKey: string;

  @IsString({
    message: 'Env variable FILES_STORAGE_SECRET_KEY must be a string',
  })
  @IsNotEmpty({ message: 'Set Env variable FILES_STORAGE_SECRET_KEY' })
  filesStorageSecretKey: string;

  @IsString({ message: 'Env variable FILES_STORAGE_BUCKET must be a string' })
  @IsNotEmpty({ message: 'Set Env variable FILES_STORAGE_BUCKET' })
  filesStorageBucket: string;

  @IsBoolean({
    message: 'Env variable FILES_STORAGE_FORCE_PATH_STYLE must be a boolean',
  })
  filesStorageForcePathStyle: boolean;

  @IsInt({
    message: 'Env variable FILES_MAX_UPLOAD_SIZE_BYTES must be an integer',
  })
  @IsPositive({
    message: 'Env variable FILES_MAX_UPLOAD_SIZE_BYTES must be positive',
  })
  maxUploadSizeBytes: number;

  @IsInt({
    message: 'Env variable FILES_PRESIGNED_POST_TTL_SECONDS must be an integer',
  })
  @IsPositive({
    message: 'Env variable FILES_PRESIGNED_POST_TTL_SECONDS must be positive',
  })
  presignedPostTtlSeconds: number;

  @IsString({ message: 'Env variable FILES_GRPC_URL must be a string' })
  @IsNotEmpty({ message: 'Set Env variable FILES_GRPC_URL' })
  grpcUrl: string;

  constructor(
    private readonly configService: ConfigService<Record<string, string>, true>,
  ) {
    this.port = Number(this.configService.get('PORT'));
    this.prismaDbUrl = this.configService.get('PRISMA_DB_URL');
    this.filesStorageEndpoint = this.configService.get(
      'FILES_STORAGE_ENDPOINT',
    );
    this.filesStorageRegion = this.configService.get('FILES_STORAGE_REGION');
    this.filesStorageAccessKey = this.configService.get(
      'FILES_STORAGE_ACCESS_KEY',
    );
    this.filesStorageSecretKey = this.configService.get(
      'FILES_STORAGE_SECRET_KEY',
    );
    this.filesStorageBucket = this.configService.get('FILES_STORAGE_BUCKET');
    this.filesStorageForcePathStyle = configValidationUtility.convertToBoolean(
      this.configService.get('FILES_STORAGE_FORCE_PATH_STYLE'),
    )!;
    this.maxUploadSizeBytes = Number(
      this.configService.get('FILES_MAX_UPLOAD_SIZE_BYTES'),
    );
    this.presignedPostTtlSeconds = Number(
      this.configService.get('FILES_PRESIGNED_POST_TTL_SECONDS'),
    );
    this.grpcUrl = this.configService.get('FILES_GRPC_URL');

    configValidationUtility.validateConfig(this);
  }
}
