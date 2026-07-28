import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadResponseDto {
  @ApiProperty({
    example: 'http://localhost:9002/dzencode-files',
    format: 'uri',
    description: 'S3-compatible Presigned POST target URL.',
  })
  public uploadUrl!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      key: 'files/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg',
      'Content-Type': 'image/jpeg',
      policy: '...',
      'x-amz-signature': '...',
    },
    description: 'Form fields required by the Presigned POST.',
  })
  public uploadFields!: Record<string, string>;

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
    description: 'Identifier of the pending File record.',
  })
  public fileId!: string;
}
