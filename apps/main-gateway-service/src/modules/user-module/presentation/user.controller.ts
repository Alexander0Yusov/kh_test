import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/swagger/error-response.dto';
import { RegisterUserCommand } from '../application/commands/register-user.command';
import { RegisterUserDto } from './register-user.dto';
import { RegisterUserResponseDto } from './register-user-response.dto';
import {
  GetCurrentUserQuery,
  type GetCurrentUserResult,
} from '../application/queries/get-current-user.query';
import {
  CurrentUser,
  type AuthenticatedUser,
  JwtAccessGuard,
} from './access-auth';
import { GetCurrentUserResponseDto } from './get-current-user-response.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Get the authenticated user',
  })
  @ApiOkResponse({ type: GetCurrentUserResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public getCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GetCurrentUserResult> {
    return this.queryBus.execute(new GetCurrentUserQuery(user.userId));
  }

  @Post('register')
  @ApiOperation({
    operationId: 'registerUser',
    summary: 'Register a user',
    description:
      'Creates a Gateway Identity user with a previously uploaded avatar file identifier.',
  })
  @ApiCreatedResponse({
    type: RegisterUserResponseDto,
    description: 'User registered successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request validation failed.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A user with this email already exists.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Safe internal server error.',
  })
  public register(
    @Body() dto: RegisterUserDto,
  ): Promise<RegisterUserResponseDto> {
    return this.commandBus.execute(
      new RegisterUserCommand(
        dto.email,
        dto.userName,
        dto.password,
        dto.homePage,
        dto.avatarFileId,
      ),
    );
  }
}
