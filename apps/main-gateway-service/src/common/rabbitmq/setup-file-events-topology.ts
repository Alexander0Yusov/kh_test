import { connect } from 'amqplib';
import { CoreConfig } from '../../../../../libs/common/src/config/core-config';
import { FILE_UPLOADED_ROUTING_KEY } from '../../../../../libs/contracts/src';

export async function setupFileEventsTopology(
  config: CoreConfig,
): Promise<void> {
  const connection = await connect(config.rabbitmqUrl);
  const channel = await connection.createChannel();

  try {
    await channel.assertExchange(config.rabbitMqExchange, 'topic', {
      durable: true,
    });
    await channel.assertQueue(config.rabbitMqGatewayFilesQueue, {
      durable: true,
      exclusive: false,
      autoDelete: false,
    });
    await channel.bindQueue(
      config.rabbitMqGatewayFilesQueue,
      config.rabbitMqExchange,
      FILE_UPLOADED_ROUTING_KEY,
    );
  } finally {
    await channel.close();
    await connection.close();
  }
}
