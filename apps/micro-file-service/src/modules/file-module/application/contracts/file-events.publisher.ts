import type { FileUploadedEvent } from '../../../../../../../libs/contracts/src';

export abstract class FileEventsPublisher {
  public abstract publishUploaded(event: FileUploadedEvent): Promise<void>;
}
