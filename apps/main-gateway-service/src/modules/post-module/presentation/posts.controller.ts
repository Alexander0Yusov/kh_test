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
  CreateRootPostCommand,
  type CreateRootPostResult,
} from '../application/commands/create-root-post.command';
import {
  CreateRootPostDto,
  CreateRootPostResponseDto,
} from './create-root-post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'createRootPost',
    summary: 'Create a root post',
  })
  @ApiCreatedResponse({ type: CreateRootPostResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public createRootPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRootPostDto,
  ): Promise<CreateRootPostResult> {
    return this.commandBus.execute(
      new CreateRootPostCommand(
        user.userId,
        dto.message,
        dto.attachmentFileId ?? null,
      ),
    );
  }
}
