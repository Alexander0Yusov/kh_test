import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FileModule } from '../file-module/file.module';
import { UserModule } from '../user-module';
import { EraseAllDataHandler } from './application/commands/erase-all-data.command';
import { MaintenanceController } from './presentation/maintenance.controller';

@Module({
  imports: [CqrsModule, FileModule, UserModule],
  controllers: [MaintenanceController],
  providers: [EraseAllDataHandler],
})
export class MaintenanceModule {}
