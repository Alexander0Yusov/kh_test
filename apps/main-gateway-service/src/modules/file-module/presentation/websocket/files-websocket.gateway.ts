import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { FileUploadedEvent } from '../../../../../../../libs/contracts/src';
import { isFileId } from '../file-id';

const FILES_SUBSCRIBE_EVENT = 'files.subscribe';
const FILES_SUBSCRIBED_EVENT = 'files.subscribed';
const FILES_UPLOADED_EVENT = 'files.uploaded';
const FILES_ERROR_EVENT = 'files.error';

type SubscribePayload = {
  fileId?: unknown;
};

@WebSocketGateway({
  namespace: '/files',
})
export class FilesWebSocketGateway {
  @WebSocketServer()
  private readonly server!: Server;

  @SubscribeMessage(FILES_SUBSCRIBE_EVENT)
  public async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const fileId = this.fileIdFrom(payload);

    if (fileId === null) {
      client.emit(FILES_ERROR_EVENT, {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed.',
        field: 'fileId',
        details: null,
      });
      return;
    }

    await client.join(this.room(fileId));
    client.emit(FILES_SUBSCRIBED_EVENT, { fileId });
  }

  public notifyUploaded(event: FileUploadedEvent): void {
    this.server.to(this.room(event.fileId)).emit(FILES_UPLOADED_EVENT, event);
  }

  private fileIdFrom(payload: unknown): string | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const fileId = (payload as SubscribePayload).fileId;
    return isFileId(fileId) ? fileId : null;
  }

  private room(fileId: string): string {
    return `file:${fileId}`;
  }
}
