import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRootPostDto {
  @ApiProperty({
    example:
      '<strong>Hello</strong> <a href="https://example.com" title="Example">link</a>',
  })
  @IsString()
  @IsNotEmpty()
  public message!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  public attachmentFileId?: string;
}

export class CreateRootPostResponseDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty()
  public message!: string;

  @ApiProperty({ format: 'date-time' })
  public publishDate!: Date;

  @ApiProperty({ format: 'uri', nullable: true })
  public attachmentUrl!: string | null;
}
