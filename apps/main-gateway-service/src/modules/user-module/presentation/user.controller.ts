import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  RegisterUserCommand,
  RegisterUserResult,
} from '../application/commands/register-user.command';
import { RegisterUserDto } from './register-user.dto';

@Controller('users')
export class UserController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  public register(@Body() dto: RegisterUserDto): Promise<RegisterUserResult> {
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
