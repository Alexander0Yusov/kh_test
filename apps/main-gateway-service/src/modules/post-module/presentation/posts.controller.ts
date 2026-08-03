import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/swagger/error-response.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
  JwtAccessGuard,
} from '../../user-module/presentation/access-auth';
import {
  CreatePostCommand,
  type CreatePostResult,
} from '../application/commands/create-post.command';
import {
  CaptchaResponseDto,
  CreatePostDto,
  CreatePostResponseDto,
  CreatePostSeedsResult,
} from './create-post.dto';
import {
  GetCaptchaQuery,
  type CaptchaChallenge,
} from '../application/queries/get-captcha.query';
import { GetPostsQueryDto, GetPostsResponseDto } from './get-posts.dto';
import {
  GetPostsQuery,
  type GetPostsResult,
} from '../application/queries/get-posts.query';
import {
  GetPostQuery,
  type GetPostResult,
} from '../application/queries/get-post.query';
import { CreatePostSeedsCommand } from '../application/commands/create-post-seeds.command';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'getPosts',
    summary: 'Get a flat page of post trees',
    description:
      'Returns selected root posts and all descendants as one flat display-ready array.',
  })
  @ApiOkResponse({ type: GetPostsResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public getPosts(@Query() dto: GetPostsQueryDto): Promise<GetPostsResult> {
    return this.queryBus.execute(
      new GetPostsQuery(
        dto.cursor,
        dto.sortBy,
        dto.sortDirection,
        dto.limit,
        dto.fields,
      ),
    );
  }

  @Get('captcha')
  @ApiOperation({ operationId: 'getPostCaptcha', summary: 'Create CAPTCHA' })
  @ApiOkResponse({ type: CaptchaResponseDto })
  public getCaptcha(): Promise<CaptchaChallenge> {
    return this.queryBus.execute(new GetCaptchaQuery());
  }

  @Get(':postId')
  @ApiOperation({
    operationId: 'getPost',
    summary: 'Get one display-ready post',
  })
  @ApiParam({ name: 'postId', format: 'uuid' })
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: '#/components/schemas/PostResponseDto' }],
      required: [
        'id',
        'parentId',
        'rootId',
        'path',
        'message',
        'publishDate',
        'userName',
        'email',
        'homePage',
        'avatarUrl',
        'attachmentUrl',
      ],
    },
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public getPost(@Param('postId') postId: string): Promise<GetPostResult> {
    return this.queryBus.execute(new GetPostQuery(postId));
  }

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'createPost',
    summary: 'Create a root post or a reply',
    description:
      'Creates a root post when parentId is absent, or a reply when parentId is provided.',
  })
  @ApiCreatedResponse({ type: CreatePostResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ): Promise<CreatePostResult> {
    return this.commandBus.execute(
      new CreatePostCommand(
        user.userId,
        dto.userName,
        dto.email,
        dto.homePage ?? null,
        dto.captchaId ?? '',
        dto.captchaValue ?? '',
        dto.message,
        dto.attachmentFileId ?? null,
        dto.parentId ?? null,
      ),
    );
  }

  @Post('seeds')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'createPostSeeds',
    summary: 'Create demonstration root posts',
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      required: ['createdCount'],
      properties: {
        createdCount: {
          type: 'number',
          example: 60,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public createPostSeeds(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatePostSeedsResult> {
    return this.commandBus.execute(new CreatePostSeedsCommand(user.userId));
  }
}
