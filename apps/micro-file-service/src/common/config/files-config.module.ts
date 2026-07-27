import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConfig } from '../../../../../libs/common/src/config/core-config';
import { FilesConfig } from './files-config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
  ],
  providers: [CoreConfig, FilesConfig],
  exports: [CoreConfig, FilesConfig],
})
export class FilesConfigModule {}
