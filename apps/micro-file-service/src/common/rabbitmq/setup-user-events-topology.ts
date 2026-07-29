import { connect } from 'amqplib';
import { CoreConfig } from '../../../../../libs/common/src/config/core-config';
import { USER_CREATED_ROUTING_KEY } from '../../../../../libs/contracts/src';

export async function setupUserEventsTopology(
  config: CoreConfig,
): Promise<void> {
  const connection = await connect(config.rabbitmqUrl);
  const channel = await connection.createChannel();

  try {
    await channel.assertExchange(config.rabbitMqExchange, 'topic', {
      durable: true,
    });
    await channel.assertQueue(config.rabbitMqFilesUserEventsQueue, {
      durable: true,
      exclusive: false,
      autoDelete: false,
    });
    await channel.bindQueue(
      config.rabbitMqFilesUserEventsQueue,
      config.rabbitMqExchange,
      USER_CREATED_ROUTING_KEY,
    );
  } finally {
    await channel.close();
    await connection.close();
  }
}
