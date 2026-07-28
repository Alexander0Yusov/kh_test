import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/swagger/error-response.dto';
import { CreateUploadCommand } from '../application/commands/create-upload.command';
import { CreateUploadResponseDto } from './create-upload-response.dto';
import { CreateUploadDto } from './dto/create-upload.dto';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post('upload-request')
  @ApiOperation({
    operationId: 'createFileUpload',
    summary: 'Create a file upload request',
    description:
      'Creates one pending File in File Service and returns one S3-compatible Presigned POST.',
  })
  @ApiCreatedResponse({
    type: CreateUploadResponseDto,
    description: 'Presigned POST created successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Gateway request validation failed.',
  })
  @ApiResponse({
    status: 413,
    type: ErrorResponseDto,
    description: 'Declared file size exceeds 102400 bytes.',
  })
  @ApiResponse({
    status: 415,
    type: ErrorResponseDto,
    description: 'File extension is not supported.',
  })
  @ApiResponse({
    status: 503,
    type: ErrorResponseDto,
    description: 'File Service is unavailable.',
  })
  public createUpload(
    @Body() dto: CreateUploadDto,
  ): Promise<CreateUploadResponseDto> {
    return this.commandBus.execute(
      new CreateUploadCommand(dto.fileExtension, dto.fileSize),
    );
  }
}
