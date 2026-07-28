import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { FilesConfig } from '../../../../common/config/files-config';
import {
  type CreatePresignedPostParams,
  type PresignedPostResult,
  StorageAdapter,
} from '../../application/contracts/storage.adapter';

@Injectable()
export class S3StorageAdapter
  extends StorageAdapter
  implements OnModuleDestroy
{
  private readonly client: S3Client;
  private readonly bucket: string;

  public constructor(config: FilesConfig) {
    super();

    this.bucket = config.filesStorageBucket;
    this.client = new S3Client({
      endpoint: config.filesStorageEndpoint,
      region: config.filesStorageRegion,
      credentials: {
        accessKeyId: config.filesStorageAccessKey,
        secretAccessKey: config.filesStorageSecretKey,
      },
      forcePathStyle: config.filesStorageForcePathStyle,
    });
  }

  public async createPresignedPost(
    params: CreatePresignedPostParams,
  ): Promise<PresignedPostResult> {
    this.validateParams(params);

    const result = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: params.key,
      Fields: {
        key: params.key,
        'Content-Type': params.contentType,
      },
      Conditions: [
        ['eq', '$key', params.key],
        ['eq', '$Content-Type', params.contentType],
        ['content-length-range', 1, params.maxSizeBytes],
      ],
      Expires: params.expiresInSeconds,
    });

    return {
      uploadUrl: result.url,
      uploadFields: result.fields,
    };
  }

  public onModuleDestroy(): void {
    this.client.destroy();
  }

  private validateParams(params: CreatePresignedPostParams): void {
    if (params.key.trim().length === 0) {
      throw new TypeError('Storage object key must not be empty.');
    }

    if (params.contentType.trim().length === 0) {
      throw new TypeError('Storage content type must not be empty.');
    }

    if (!Number.isInteger(params.maxSizeBytes) || params.maxSizeBytes <= 0) {
      throw new RangeError('Storage maximum size must be a positive integer.');
    }

    if (
      !Number.isInteger(params.expiresInSeconds) ||
      params.expiresInSeconds <= 0
    ) {
      throw new RangeError('Presigned POST TTL must be a positive integer.');
    }
  }
}
