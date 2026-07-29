import type { PostCreatedEvent } from '../../../../../../../libs/contracts/src';

export abstract class PostEventsPublisher {
  public abstract publishCreated(event: PostCreatedEvent): Promise<void>;
}
