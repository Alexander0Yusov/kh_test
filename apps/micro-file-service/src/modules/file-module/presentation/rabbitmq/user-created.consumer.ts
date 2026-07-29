import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import {
  USER_CREATED_ROUTING_KEY,
  type UserCreatedEvent,
} from '../../../../../../../libs/contracts/src';
import {
  MarkFileUsedCommand,
  type MarkFileUsedResult,
} from '../../application/commands/mark-file-used.command';
import { FileStatus } from '../../domain';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
export class UserCreatedConsumer {
  private readonly logger = new Logger(UserCreatedConsumer.name);

  public constructor(private readonly commandBus: CommandBus) {}

  @EventPattern(USER_CREATED_ROUTING_KEY)
  public async handle(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    if (!this.isUserCreatedEvent(payload)) {
      this.logger.warn('Ignored malformed users.created event');
      channel.ack(message);
      return;
    }

    try {
      const result = await this.commandBus.execute<
        MarkFileUsedCommand,
        MarkFileUsedResult
      >(new MarkFileUsedCommand(payload.avatarFileId));

      if (result.status === null) {
        this.logger.error(`File ${result.fileId} does not exist`);
      } else if (result.status !== FileStatus.Used) {
        this.logger.error(
          `File ${result.fileId} has unexpected status ${result.status}`,
        );
      }

      channel.ack(message);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to mark file as used: ${this.errorMessage(error)}`,
      );
      channel.nack(message, false, true);
    }
  }

  private isUserCreatedEvent(value: unknown): value is UserCreatedEvent {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const event = value as Partial<UserCreatedEvent>;
    return (
      typeof event.userId === 'string' &&
      UUID_PATTERN.test(event.userId) &&
      typeof event.avatarFileId === 'string' &&
      UUID_PATTERN.test(event.avatarFileId)
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
