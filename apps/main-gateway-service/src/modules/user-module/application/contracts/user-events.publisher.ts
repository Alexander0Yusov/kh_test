import type { UserCreatedEvent } from '../../../../../../../libs/contracts/src';

export abstract class UserEventsPublisher {
  public abstract publishCreated(event: UserCreatedEvent): Promise<void>;
}
