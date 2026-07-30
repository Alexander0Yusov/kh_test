import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ pattern: '^[A-Za-z0-9]+$', example: 'Alexander1' })
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  public userName!: string;

  @ApiProperty({ format: 'email', example: 'author@example.com' })
  @IsEmail()
  public email!: string;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  @ValidateIf((_, value: unknown) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  public homePage?: string;

  @ApiProperty({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  public captchaId?: string;

  @ApiProperty({ pattern: '^[A-Za-z0-9]+$' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  public captchaValue?: string;

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

  @ApiProperty({ format: 'uuid', nullable: true })
  public rootId!: string | null;

  @ApiProperty()
  public path!: string;

  @ApiProperty()
  public message!: string;

  @ApiProperty({ format: 'date-time' })
  public publishDate!: Date;

  @ApiProperty()
  public userName!: string;

  @ApiProperty({ format: 'email' })
  public email!: string;

  @ApiProperty({ format: 'uri', nullable: true })
  public homePage!: string | null;

  @ApiProperty({ format: 'uri', nullable: true })
  public avatarUrl!: string | null;

  @ApiProperty({ format: 'uri', nullable: true })
  public attachmentUrl!: string | null;
}

export class CaptchaResponseDto {
  @ApiProperty({ format: 'uuid' })
  public captchaId!: string;

  @ApiProperty({ example: 'data:image/png;base64,...' })
  public image!: string;
}
