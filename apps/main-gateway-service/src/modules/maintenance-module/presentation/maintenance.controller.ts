import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/swagger/error-response.dto';
import { EraseAllDataCommand } from '../application/commands/erase-all-data.command';

@ApiTags('Maintenance')
@Controller()
export class MaintenanceController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Delete('erase-all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'eraseAllData',
    summary: 'Erase all project data',
    description:
      '⚠️ WARNING: This endpoint exists exclusively for convenient reset and demonstration of the test project. It irreversibly deletes all application database records, uploaded storage objects, and temporary project resources. This approach must never be exposed or implemented in a production business system.',
  })
  @ApiNoContentResponse({ description: 'All demonstration data was erased.' })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public async eraseAllData(): Promise<void> {
    await this.commandBus.execute(new EraseAllDataCommand());
  }
}
