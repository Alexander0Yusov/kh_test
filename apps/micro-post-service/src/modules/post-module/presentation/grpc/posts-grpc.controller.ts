import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type Empty,
  POSTS_SERVICE_NAME,
} from '../../../../../../../libs/contracts/src';
import { EraseAllDataCommand } from '../../application/commands/erase-all-data.command';

@Controller()
export class PostsGrpcController {
  public constructor(private readonly commandBus: CommandBus) {}

  @GrpcMethod(POSTS_SERVICE_NAME, 'EraseAllData')
  public async eraseAllData(): Promise<Empty> {
    await this.commandBus.execute(new EraseAllDataCommand());
    return {};
  }
}
