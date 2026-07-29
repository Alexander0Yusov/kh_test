import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from '@aws-sdk/client-sqs';
import { FilesConfig } from '../../../../common/config/files-config';
import {
  ProcessUploadedFileCommand,
  type ProcessUploadedFileResult,
} from '../../application/commands/process-uploaded-file.command';

const STORAGE_KEY_PATTERN =
  /^files\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(?:jpg|png|gif|txt)$/i;
const RECEIVE_ERROR_DELAY_MS = 1_000;

type S3EventRecord = {
  eventName?: unknown;
  s3?: {
    bucket?: { name?: unknown };
    object?: { key?: unknown };
  };
};

type S3Event = {
  Event?: unknown;
  Records?: unknown;
};

@Injectable()
export class SqsStorageEventsConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SqsStorageEventsConsumer.name);
  private readonly client: SQSClient;
  private readonly abortController = new AbortController();
  private polling: Promise<void> | null = null;

  public constructor(
    private readonly config: FilesConfig,
    private readonly commandBus: CommandBus,
  ) {
    const credentials =
      config.awsAccessKeyId !== undefined &&
      config.awsSecretAccessKey !== undefined
        ? {
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
          }
        : undefined;

    this.client = new SQSClient({
      endpoint: config.sqsEndpoint,
      region: config.awsRegion,
      credentials,
    });
  }

  public onApplicationBootstrap(): void {
    this.logger.log('Starting SQS storage events polling');
    this.polling = this.poll();
  }

  public async onApplicationShutdown(): Promise<void> {
    this.abortController.abort();
    await this.polling;
    this.client.destroy();
    this.logger.log('Stopped SQS storage events polling');
  }

  private async poll(): Promise<void> {
    while (!this.abortController.signal.aborted) {
      try {
        const response = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.config.sqsQueueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: this.config.sqsWaitTimeSeconds,
            VisibilityTimeout: this.config.sqsVisibilityTimeoutSeconds,
          }),
          { abortSignal: this.abortController.signal },
        );

        const message = response.Messages?.[0];

        if (message !== undefined) {
          await this.handleMessage(message);
        }
      } catch (error: unknown) {
        if (this.abortController.signal.aborted) {
          break;
        }

        this.logger.error(
          `Temporary SQS processing error: ${this.errorMessage(error)}`,
        );
        await this.delayAfterReceiveError();
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    const receiptHandle = message.ReceiptHandle;

    if (receiptHandle === undefined) {
      this.logger.warn('Ignored SQS message without a receipt handle');
      return;
    }

    const fileIds = this.extractFileIds(message.Body);

    for (const fileId of fileIds) {
      this.logger.log(`Processing uploaded file ${fileId}`);
      const result = await this.commandBus.execute<
        ProcessUploadedFileCommand,
        ProcessUploadedFileResult
      >(new ProcessUploadedFileCommand(fileId));

      if (result.status === null) {
        this.logger.warn(`Ignored orphan storage event for file ${fileId}`);
      }
    }

    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.config.sqsQueueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
    this.logger.log('Acknowledged SQS storage event');
  }

  private extractFileIds(body: string | undefined): string[] {
    if (body === undefined) {
      this.logger.warn('Ignored SQS message without a body');
      return [];
    }

    let event: S3Event;

    try {
      event = JSON.parse(body) as S3Event;
    } catch {
      this.logger.warn('Ignored malformed SQS storage event');
      return [];
    }

    if (event.Event === 's3:TestEvent') {
      this.logger.warn('Ignored S3 test event');
      return [];
    }

    if (!Array.isArray(event.Records)) {
      this.logger.warn('Ignored SQS message without S3 event records');
      return [];
    }

    const fileIds: string[] = [];

    for (const value of event.Records) {
      const fileId = this.extractFileId(value as S3EventRecord);

      if (fileId === null) {
        this.logger.warn('Ignored irrelevant S3 event record');
      } else {
        fileIds.push(fileId);
      }
    }

    return fileIds;
  }

  private extractFileId(record: S3EventRecord): string | null {
    if (
      typeof record.eventName !== 'string' ||
      !record.eventName.startsWith('ObjectCreated:') ||
      record.s3?.bucket?.name !== this.config.s3Bucket ||
      typeof record.s3.object?.key !== 'string'
    ) {
      return null;
    }

    let key: string;

    try {
      key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    } catch {
      return null;
    }

    return STORAGE_KEY_PATTERN.exec(key)?.[1] ?? null;
  }

  private async delayAfterReceiveError(): Promise<void> {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, RECEIVE_ERROR_DELAY_MS);
      this.abortController.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
