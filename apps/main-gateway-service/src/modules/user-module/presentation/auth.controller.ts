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
import type { Request, Response } from 'express';
import { CoreConfig } from '../../../../../../libs/common/src/config';
import { GatewayConfig } from '../../../common/config/gateway-config';
import { LoginUserCommand } from '../application/commands/login-user.command';
import { LogoutUserCommand } from '../application/commands/logout-user.command';
import { RefreshTokenCommand } from '../application/commands/refresh-token.command';
import { LoginUserDto } from './login-user.dto';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from './refresh-token-cookie';

type AccessTokenResponse = {
  accessToken: string;
};

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly commandBus: CommandBus,
    private readonly coreConfig: CoreConfig,
    private readonly gatewayConfig: GatewayConfig,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() dto: LoginUserDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponse> {
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
  public async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponse> {
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
