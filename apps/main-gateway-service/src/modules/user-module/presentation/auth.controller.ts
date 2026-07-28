import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CoreConfig } from '../../../../../../libs/common/src/config';
import { GatewayConfig } from '../../../common/config/gateway-config';
import { ErrorResponseDto } from '../../../common/swagger/error-response.dto';
import { LoginUserCommand } from '../application/commands/login-user.command';
import { LogoutUserCommand } from '../application/commands/logout-user.command';
import { RefreshTokenCommand } from '../application/commands/refresh-token.command';
import { AccessTokenResponseDto } from './auth-response.dto';
import { LoginUserDto } from './login-user.dto';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from './refresh-token-cookie';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly coreConfig: CoreConfig,
    private readonly gatewayConfig: GatewayConfig,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'loginUser',
    summary: 'Log in',
    description:
      'Authenticates a user, creates a server-side session and sets an HttpOnly refresh cookie.',
  })
  @ApiOkResponse({
    type: AccessTokenResponseDto,
    description: 'Login succeeded.',
    headers: {
      'Set-Cookie': {
        description: 'HttpOnly refreshToken cookie.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request validation failed.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Invalid email or password.',
  })
  public async login(
    @Body() dto: LoginUserDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    const result = await this.commandBus.execute(
      new LoginUserCommand(
        dto.email,
        dto.password,
        dto.deviceId,
        dto.deviceName,
        ip,
      ),
    );

    setRefreshTokenCookie(
      response,
      result.refreshToken,
      this.coreConfig,
      this.gatewayConfig,
    );

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({
    operationId: 'refreshToken',
    summary: 'Refresh access token',
    description:
      'Rotates the session using the HttpOnly refreshToken cookie and sets a new refresh cookie.',
  })
  @ApiOkResponse({
    type: AccessTokenResponseDto,
    description: 'Token pair rotated successfully.',
    headers: {
      'Set-Cookie': {
        description: 'Updated HttpOnly refreshToken cookie.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Refresh cookie is missing, invalid, expired or revoked.',
  })
  public async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    const result = await this.commandBus.execute(
      new RefreshTokenCommand(readRefreshTokenCookie(request) ?? ''),
    );

    setRefreshTokenCookie(
      response,
      result.refreshToken,
      this.coreConfig,
      this.gatewayConfig,
    );

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({
    operationId: 'logoutUser',
    summary: 'Log out',
    description:
      'Clears the refresh cookie. A missing cookie is idempotently accepted; a malformed cookie returns unauthorized.',
  })
  @ApiNoContentResponse({
    description: 'Logout completed; no response body.',
    headers: {
      'Set-Cookie': {
        description: 'Clears the refreshToken cookie.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Refresh cookie is malformed or has an invalid signature.',
  })
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = readRefreshTokenCookie(request);

    clearRefreshTokenCookie(response, this.coreConfig);

    if (refreshToken === undefined) {
      return;
    }

    await this.commandBus.execute(new LogoutUserCommand(refreshToken));
  }
}
