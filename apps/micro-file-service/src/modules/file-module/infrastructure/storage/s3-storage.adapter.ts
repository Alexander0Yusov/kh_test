import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { FilesConfig } from '../../../../common/config/files-config';
import {
  type CreatePresignedPostParams,
  type PresignedPostResult,
  StorageAdapter,
  type StorageObjectMetadata,
  StorageObjectTooLargeError,
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

    const credentials =
      config.awsAccessKeyId !== undefined &&
      config.awsSecretAccessKey !== undefined
        ? {
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
          }
        : undefined;

    this.bucket = config.s3Bucket;
    this.client = new S3Client({
      endpoint: config.s3Endpoint,
      region: config.awsRegion,
      credentials,
      forcePathStyle: config.s3ForcePathStyle,
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

  public async headObject(key: string): Promise<StorageObjectMetadata | null> {
    this.validateKey(key);

    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const size = result.ContentLength;

      if (
        typeof size !== 'number' ||
        !Number.isFinite(size) ||
        !Number.isInteger(size) ||
        size < 0
      ) {
        throw new Error('Storage returned an invalid object size.');
      }

      return {
        size,
        contentType: result.ContentType ?? null,
      };
    } catch (error: unknown) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  public async getObject(
    key: string,
    maxSizeBytes: number,
  ): Promise<Uint8Array | null> {
    this.validateKey(key);
    this.validateMaxSize(maxSizeBytes);

    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: `bytes=0-${maxSizeBytes}`,
        }),
      );

      if (result.Body === undefined) {
        throw new Error('Storage returned an empty object body.');
      }

      const bytes = await result.Body.transformToByteArray();

      if (bytes.byteLength > maxSizeBytes) {
        throw new StorageObjectTooLargeError();
      }

      return bytes;
    } catch (error: unknown) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  public async deleteObject(key: string): Promise<void> {
    this.validateKey(key);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
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

  private validateKey(key: string): void {
    if (key.trim().length === 0) {
      throw new TypeError('Storage object key must not be empty.');
    }
  }

  private validateMaxSize(maxSizeBytes: number): void {
    if (
      !Number.isFinite(maxSizeBytes) ||
      !Number.isInteger(maxSizeBytes) ||
      maxSizeBytes <= 0
    ) {
      throw new RangeError('Storage maximum size must be a positive integer.');
    }
  }

  private isNotFound(error: unknown): boolean {
    return (
      error instanceof S3ServiceException &&
      (error.name === 'NoSuchKey' ||
        error.name === 'NotFound' ||
        error.$metadata.httpStatusCode === 404)
    );
  }
}
