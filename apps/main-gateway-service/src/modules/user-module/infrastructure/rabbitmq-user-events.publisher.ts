import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import { CoreConfig } from '../../../../../../libs/common/src/config/core-config';
import {
  USER_CREATED_ROUTING_KEY,
  type UserCreatedEvent,
} from '../../../../../../libs/contracts/src';
import { UserEventsPublisher } from '../application/contracts/user-events.publisher';

@Injectable()
export class RabbitMqUserEventsPublisher
  extends UserEventsPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqUserEventsPublisher.name);
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

  public async publishCreated(event: UserCreatedEvent): Promise<void> {
    if (this.channel === null) {
      throw new Error('RabbitMQ user events publisher is not initialized.');
    }

    try {
      this.channel.publish(
        this.config.rabbitMqExchange,
        USER_CREATED_ROUTING_KEY,
        Buffer.from(
          JSON.stringify({
            pattern: USER_CREATED_ROUTING_KEY,
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
        `Failed to publish users.created: ${this.errorMessage(error)}`,
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
