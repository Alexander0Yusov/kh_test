import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    example: 'VALIDATION_FAILED',
    description: 'Stable machine-readable error code.',
  })
  public code!: string;

  @ApiProperty({
    example: 'Validation failed.',
    description: 'Safe public error message.',
  })
  public message!: string;

  @ApiProperty({
    example: 'fileSize',
    nullable: true,
    description: 'Invalid field name, or null for non-field errors.',
  })
  public field!: string | null;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    example: null,
    description: 'Additional safe error details. Currently null.',
  })
  public details!: Record<string, unknown> | null;
}
