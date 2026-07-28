import { randomUUID } from 'node:crypto';
import { Command } from '@nestjs/cqrs';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserEntity } from '../../domain';
import { PasswordHasher } from '../contracts/password-hasher';
import { UserRepository } from '../contracts/user.repository';

export type RegisterUserResult = {
  id: string;
  email: string;
  userName: string;
  homePage: string;
  avatarFileId: string;
  createdAt: Date;
};

export class RegisterUserCommand extends Command<RegisterUserResult> {
  public constructor(
    public readonly email: string,
    public readonly userName: string,
    public readonly password: string,
    public readonly homePage: string,
    public readonly avatarFileId: string,
  ) {
    super();
  }
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  RegisterUserResult
> {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(
    command: RegisterUserCommand,
  ): Promise<RegisterUserResult> {
    const email = command.email.trim().toLowerCase();
    const passwordHash = await this.passwordHasher.hash(command.password);
    const id = randomUUID();

    const user = new UserEntity({
      id,
      email,
      userName: command.userName.trim(),
      passwordHash,
      homePage: command.homePage.trim(),
      avatarFileId: command.avatarFileId,
    });

    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      homePage: user.homePage,
      avatarFileId: user.avatarFileId,
      createdAt: user.createdAt,
    };
  }
}
