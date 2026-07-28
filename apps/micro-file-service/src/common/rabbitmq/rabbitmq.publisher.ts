import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import { CoreConfig } from '../../../../../libs/common/src/config/core-config';
import {
  FILE_UPLOADED_ROUTING_KEY,
  type FileUploadedEvent,
} from '../../../../../libs/contracts/src';
import { FileEventsPublisher } from '../../modules/file-module/application/contracts/file-events.publisher';

@Injectable()
export class RabbitMqPublisher
  extends FileEventsPublisher
  implements OnModuleInit, OnModuleDestroy
{
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

  public async publishUploaded(event: FileUploadedEvent): Promise<void> {
    if (this.channel === null) {
      throw new Error('RabbitMQ publisher is not initialized.');
    }

    const packet = {
      pattern: FILE_UPLOADED_ROUTING_KEY,
      data: event,
    };

    this.channel.publish(
      this.config.rabbitMqExchange,
      FILE_UPLOADED_ROUTING_KEY,
      Buffer.from(JSON.stringify(packet)),
      {
        contentType: 'application/json',
        persistent: true,
      },
    );
    await this.channel.waitForConfirms();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
