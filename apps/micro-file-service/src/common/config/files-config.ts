import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf,
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

  @IsString({ message: 'Env variable AWS_REGION must be a string' })
  @IsNotEmpty({ message: 'Set Env variable AWS_REGION' })
  awsRegion: string;

  @ValidateIf(
    (config: FilesConfig) =>
      config.awsAccessKeyId !== undefined ||
      config.awsSecretAccessKey !== undefined,
  )
  @IsString({ message: 'Env variable AWS_ACCESS_KEY_ID must be a string' })
  @IsNotEmpty({ message: 'Set both AWS credential variables or neither' })
  awsAccessKeyId: string | undefined;

  @ValidateIf(
    (config: FilesConfig) =>
      config.awsAccessKeyId !== undefined ||
      config.awsSecretAccessKey !== undefined,
  )
  @IsString({ message: 'Env variable AWS_SECRET_ACCESS_KEY must be a string' })
  @IsNotEmpty({ message: 'Set both AWS credential variables or neither' })
  awsSecretAccessKey: string | undefined;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'Env variable S3_ENDPOINT must be a valid URL' },
  )
  s3Endpoint: string | undefined;

  @IsString({ message: 'Env variable S3_BUCKET must be a string' })
  @IsNotEmpty({ message: 'Set Env variable S3_BUCKET' })
  s3Bucket: string;

  @IsBoolean({
    message: 'Env variable S3_FORCE_PATH_STYLE must be a boolean',
  })
  s3ForcePathStyle: boolean;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'Env variable SQS_ENDPOINT must be a valid URL' },
  )
  sqsEndpoint: string | undefined;

  @IsUrl(
    { require_protocol: true },
    { message: 'Env variable SQS_QUEUE_URL must be a valid URL' },
  )
  sqsQueueUrl: string;

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
    this.awsRegion = this.configService.get('AWS_REGION');
    this.awsAccessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    this.awsSecretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    this.s3Endpoint = this.configService.get('S3_ENDPOINT');
    this.s3Bucket = this.configService.get('S3_BUCKET');
    this.s3ForcePathStyle = configValidationUtility.convertToBoolean(
      this.configService.get('S3_FORCE_PATH_STYLE'),
    )!;
    this.sqsEndpoint = this.configService.get('SQS_ENDPOINT');
    this.sqsQueueUrl = this.configService.get('SQS_QUEUE_URL');
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
