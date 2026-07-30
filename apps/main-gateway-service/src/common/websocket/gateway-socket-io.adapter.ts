import type { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { IncomingMessage } from 'node:http';
import type { Server, ServerOptions } from 'socket.io';
import { GatewayConfig } from '../config/gateway-config';

type AllowRequestCallback = (
  error: string | null | undefined,
  success: boolean,
) => void;

export class GatewaySocketIoAdapter extends IoAdapter {
  public constructor(
    app: INestApplication,
    private readonly config: GatewayConfig,
  ) {
    super(app);
  }

  public createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: [this.config.frontEndUrl],
        credentials: true,
      },
      allowRequest: this.allowRequest.bind(this),
    }) as Server;
  }

  private allowRequest(
    request: IncomingMessage,
    callback: AllowRequestCallback,
  ): void {
    callback(null, request.headers.origin === this.config.frontEndUrl);
  }
}
