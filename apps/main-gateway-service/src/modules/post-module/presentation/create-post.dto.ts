import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePostDto {
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

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  public parentId?: string;
}

export class CreatePostResponseDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  public parentId!: string | null;

  @ApiProperty()
  public message!: string;

  @ApiProperty({ format: 'date-time' })
  public publishDate!: Date;

  @ApiProperty({ format: 'uri', nullable: true })
  public attachmentUrl!: string | null;
}
