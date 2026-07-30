import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import type { PostCreatedEvent } from '../../../../../../../libs/contracts/src';

export type PostCreatedWebSocketEvent = Pick<
  PostCreatedEvent,
  'postId' | 'parentId' | 'rootId' | 'publishDate' | 'userName' | 'email'
>;

@WebSocketGateway({
  namespace: '/posts',
})
export class PostsWebSocketGateway {
  @WebSocketServer()
  private readonly server!: Server;

  public notifyCreated(event: PostCreatedEvent): void {
    const payload: PostCreatedWebSocketEvent = {
      postId: event.postId,
      parentId: event.parentId,
      rootId: event.rootId,
      publishDate: event.publishDate,
      userName: event.userName,
      email: event.email,
    };

    this.server.emit('posts.created', payload);
  }
}
