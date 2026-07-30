import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  PostOptionalField,
  RootPostSortBy,
  SortDirection,
} from '../application/contracts/posts.client';

const SORT_BY_VALUES: RootPostSortBy[] = ['createdAt', 'userName', 'email'];
const SORT_DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];
const OPTIONAL_FIELD_VALUES: PostOptionalField[] = [
  'avatar',
  'userName',
  'email',
  'homePage',
  'publishDate',
  'attachment',
];

export class GetPostsQueryDto {
  @ApiPropertyOptional({ description: 'Opaque Posts pagination cursor.' })
  @IsOptional()
  @IsString()
  public cursor?: string;

  @ApiPropertyOptional({ enum: SORT_BY_VALUES })
  @IsOptional()
  @IsIn(SORT_BY_VALUES)
  public sortBy?: RootPostSortBy;

  @ApiPropertyOptional({ enum: SORT_DIRECTION_VALUES })
  @IsOptional()
  @IsIn(SORT_DIRECTION_VALUES)
  public sortDirection?: SortDirection;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50 })
  @Transform(parseLimit)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  public limit?: number;

  @ApiPropertyOptional({
    type: 'string',
    example: 'avatar,userName,email,homePage,publishDate,attachment',
    description:
      'Comma-separated optional fields. An empty value requests structural fields only.',
  })
  @Transform(parseFields)
  @IsOptional()
  @IsArray()
  @IsIn(OPTIONAL_FIELD_VALUES, { each: true })
  public fields?: PostOptionalField[];
}

export class PostResponseDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  public parentId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  public rootId!: string | null;

  @ApiProperty({ example: '1.2.1' })
  public path!: string;

  @ApiProperty({ example: 'Message text' })
  public message!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  public publishDate?: Date;

  @ApiPropertyOptional({ example: 'Alexander' })
  public userName?: string;

  @ApiPropertyOptional({ format: 'email', example: 'alex@example.com' })
  public email?: string;

  @ApiPropertyOptional({
    format: 'uri',
    example: 'https://example.com',
    nullable: true,
  })
  public homePage?: string | null;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  public avatarUrl?: string | null;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  public attachmentUrl?: string | null;
}

export class GetPostsResponseDto {
  @ApiProperty({ type: PostResponseDto, isArray: true })
  public items!: PostResponseDto[];

  @ApiProperty({ nullable: true })
  public nextCursor!: string | null;

  @ApiProperty()
  public hasMore!: boolean;

  @ApiProperty({ enum: OPTIONAL_FIELD_VALUES, isArray: true })
  public fields!: PostOptionalField[];
}

function parseLimit({ value }: TransformFnParams): unknown {
  return typeof value === 'string' && value.length > 0 ? Number(value) : value;
}

function parseFields({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.length === 0 ? [] : value.split(',');
}
