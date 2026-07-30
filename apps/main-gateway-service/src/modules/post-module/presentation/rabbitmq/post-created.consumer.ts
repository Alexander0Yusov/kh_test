import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import {
  POST_CREATED_ROUTING_KEY,
  type PostCreatedEvent,
} from '../../../../../../../libs/contracts/src';
import { PostsWebSocketGateway } from '../websocket/posts-websocket.gateway';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
export class PostCreatedConsumer {
  private readonly logger = new Logger(PostCreatedConsumer.name);

  public constructor(
    private readonly postsWebSocketGateway: PostsWebSocketGateway,
  ) {}

  @EventPattern(POST_CREATED_ROUTING_KEY)
  public handle(@Payload() payload: unknown, @Ctx() context: RmqContext): void {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    if (!this.isPostCreatedEvent(payload)) {
      this.logger.warn('Ignored malformed posts.created event');
      channel.ack(message);
      return;
    }

    try {
      this.postsWebSocketGateway.notifyCreated(payload);
      channel.ack(message);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to broadcast posts.created: ${this.errorMessage(error)}`,
      );
      channel.nack(message, false, true);
    }
  }

  private isPostCreatedEvent(value: unknown): value is PostCreatedEvent {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const event = value as Partial<PostCreatedEvent>;
    const root = event.parentId === null && event.rootId === null;
    const reply =
      typeof event.parentId === 'string' &&
      UUID_PATTERN.test(event.parentId) &&
      typeof event.rootId === 'string' &&
      UUID_PATTERN.test(event.rootId);

    return (
      typeof event.postId === 'string' &&
      UUID_PATTERN.test(event.postId) &&
      typeof event.userId === 'string' &&
      UUID_PATTERN.test(event.userId) &&
      (root || reply) &&
      typeof event.publishDate === 'string' &&
      this.isIsoDate(event.publishDate) &&
      typeof event.userName === 'string' &&
      event.userName.length > 0 &&
      typeof event.email === 'string' &&
      event.email.length > 0 &&
      (event.attachmentFileId === null ||
        (typeof event.attachmentFileId === 'string' &&
          UUID_PATTERN.test(event.attachmentFileId)))
    );
  }

  private isIsoDate(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString() === value;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
