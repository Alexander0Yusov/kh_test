import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  type ClientProvider,
  ClientsModule,
  Transport,
} from '@nestjs/microservices';
import { join } from 'node:path';
import { GatewayConfig } from '../../common/config/gateway-config';
import {
  FILES_SERVICE_NAME,
  FILES_V1_PACKAGE_NAME,
} from '../../../../../libs/contracts/src';
import { CreateUploadHandler } from './application/commands/create-upload.command';
import { FilesClient } from './application/contracts/files.client';
import { FilesGrpcClient } from './infrastructure/files-grpc.client';
import { FilesController } from './presentation/files.controller';

function createFilesClientOptions(config: GatewayConfig): ClientProvider {
  return {
    transport: Transport.GRPC,
    options: {
      url: config.fileServiceGrpcUrl,
      package: FILES_V1_PACKAGE_NAME,
      protoPath: join(
        process.cwd(),
        'libs',
        'contracts',
        'src',
        'proto',
        'files.proto',
      ),
      loader: {
        longs: Number,
      },
    },
  };
}

@Module({
  imports: [
    CqrsModule,
    ClientsModule.registerAsync([
      {
        name: FILES_SERVICE_NAME,
        inject: [GatewayConfig],
        useFactory: createFilesClientOptions,
      },
    ]),
  ],
  controllers: [FilesController],
  providers: [
    CreateUploadHandler,
    {
      provide: FilesClient,
      useClass: FilesGrpcClient,
    },
  ],
})
export class FileModule {}
