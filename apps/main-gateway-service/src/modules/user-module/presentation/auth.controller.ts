import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  LoginUserCommand,
  LoginUserResult,
} from '../application/commands/login-user.command';
import { LogoutUserCommand } from '../application/commands/logout-user.command';
import { LoginUserDto } from './login-user.dto';
import { LogoutUserDto } from './logout-user.dto';

@Controller('auth')
export class AuthController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public login(
    @Body() dto: LoginUserDto,
    @Ip() ip: string,
  ): Promise<LoginUserResult> {
    return this.commandBus.execute(
      new LoginUserCommand(
        dto.email,
        dto.password,
        dto.deviceId,
        dto.deviceName,
        ip,
      ),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Body() dto: LogoutUserDto): Promise<void> {
    await this.commandBus.execute(new LogoutUserCommand(dto.refreshToken));
  }
}
