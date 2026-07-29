import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import {
  POST_CREATED_ROUTING_KEY,
  type PostCreatedEvent,
} from '../../../../../../../libs/contracts/src';
import {
  MarkFileUsedCommand,
  type MarkFileUsedResult,
} from '../../application/commands/mark-file-used.command';
import { FileStatus } from '../../domain';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
export class PostCreatedConsumer {
  private readonly logger = new Logger(PostCreatedConsumer.name);

  public constructor(private readonly commandBus: CommandBus) {}

  @EventPattern(POST_CREATED_ROUTING_KEY)
  public async handle(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    if (!this.isPostCreatedEvent(payload)) {
      this.logger.warn('Ignored malformed posts.created event');
      channel.ack(message);
      return;
    }

    if (payload.attachmentFileId === null) {
      channel.ack(message);
      return;
    }

    try {
      const result = await this.commandBus.execute<
        MarkFileUsedCommand,
        MarkFileUsedResult
      >(new MarkFileUsedCommand(payload.attachmentFileId));

      if (
        result.status === null ||
        (result.status !== FileStatus.Uploaded &&
          result.status !== FileStatus.Used)
      ) {
        this.logger.warn(
          `Ignored posts.created for file ${result.fileId} with status ${result.status ?? 'missing'}`,
        );
      }

      channel.ack(message);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to mark post attachment as used: ${this.errorMessage(error)}`,
      );
      channel.nack(message, false, true);
    }
  }

  private isPostCreatedEvent(value: unknown): value is PostCreatedEvent {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const event = value as Partial<PostCreatedEvent>;
    return (
      typeof event.postId === 'string' &&
      UUID_PATTERN.test(event.postId) &&
      typeof event.userId === 'string' &&
      UUID_PATTERN.test(event.userId) &&
      (event.attachmentFileId === null ||
        (typeof event.attachmentFileId === 'string' &&
          UUID_PATTERN.test(event.attachmentFileId)))
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
