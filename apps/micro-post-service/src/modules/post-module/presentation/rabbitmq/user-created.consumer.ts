import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import {
  USER_CREATED_ROUTING_KEY,
  type UserCreatedEvent,
} from '../../../../../../../libs/contracts/src';
import { PostUserRepository } from '../../application/contracts/post-user.repository';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
export class UserCreatedConsumer {
  private readonly logger = new Logger(UserCreatedConsumer.name);

  public constructor(private readonly postUserRepository: PostUserRepository) {}

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
      await this.postUserRepository.upsert({
        id: payload.userId,
        email: payload.email,
        userName: payload.userName,
      });
      channel.ack(message);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to upsert PostUser: ${this.errorMessage(error)}`,
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
      typeof event.email === 'string' &&
      event.email.length > 0 &&
      typeof event.userName === 'string' &&
      event.userName.length > 0 &&
      typeof event.avatarFileId === 'string' &&
      UUID_PATTERN.test(event.avatarFileId)
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
