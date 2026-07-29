import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
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
import { CreatePostDto, CreatePostResponseDto } from './create-post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  public constructor(private readonly commandBus: CommandBus) {}

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
        dto.message,
        dto.attachmentFileId ?? null,
        dto.parentId ?? null,
      ),
    );
  }
}
