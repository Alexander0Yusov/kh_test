import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import { CoreConfig } from '../../../../../../libs/common/src/config/core-config';
import {
  POST_CREATED_ROUTING_KEY,
  type PostCreatedEvent,
} from '../../../../../../libs/contracts/src';
import { PostEventsPublisher } from '../application/contracts/post-events.publisher';

@Injectable()
export class RabbitMqPostEventsPublisher
  extends PostEventsPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqPostEventsPublisher.name);
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  public constructor(private readonly config: CoreConfig) {
    super();
  }

  public async onModuleInit(): Promise<void> {
    this.connection = await connect(this.config.rabbitmqUrl);
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(this.config.rabbitMqExchange, 'topic', {
      durable: true,
    });
  }

  public async publishCreated(event: PostCreatedEvent): Promise<void> {
    if (this.channel === null) {
      throw new Error('RabbitMQ post events publisher is not initialized.');
    }

    try {
      this.channel.publish(
        this.config.rabbitMqExchange,
        POST_CREATED_ROUTING_KEY,
        Buffer.from(
          JSON.stringify({
            pattern: POST_CREATED_ROUTING_KEY,
            data: event,
          }),
        ),
        {
          contentType: 'application/json',
          persistent: true,
        },
      );
      await this.channel.waitForConfirms();
    } catch (error: unknown) {
      this.logger.error(
        `Failed to publish posts.created: ${this.errorMessage(error)}`,
      );
      throw error;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
