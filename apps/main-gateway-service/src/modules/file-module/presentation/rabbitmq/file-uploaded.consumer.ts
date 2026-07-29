import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import {
  FILE_UPLOADED_ROUTING_KEY,
  type FileUploadedEvent,
} from '../../../../../../../libs/contracts/src';
import { isFileId } from '../file-id';
import { FilesWebSocketGateway } from '../websocket/files-websocket.gateway';

@Controller()
export class FileUploadedConsumer {
  private readonly logger = new Logger(FileUploadedConsumer.name);

  public constructor(
    private readonly filesWebSocketGateway: FilesWebSocketGateway,
  ) {}

  @EventPattern(FILE_UPLOADED_ROUTING_KEY)
  public handle(@Payload() payload: unknown, @Ctx() context: RmqContext): void {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    if (!this.isFileUploadedEvent(payload)) {
      this.logger.warn('Ignored malformed files.uploaded event');
      channel.ack(message);
      return;
    }

    try {
      this.filesWebSocketGateway.notifyUploaded(payload);
      channel.ack(message);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to notify WebSocket room: ${this.errorMessage(error)}`,
      );
      channel.nack(message, false, true);
    }
  }

  private isFileUploadedEvent(value: unknown): value is FileUploadedEvent {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const event = value as Partial<FileUploadedEvent>;
    return isFileId(event.fileId) && event.status === 'UPLOADED';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
