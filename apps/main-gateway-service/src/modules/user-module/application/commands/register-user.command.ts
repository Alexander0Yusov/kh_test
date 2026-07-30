import { randomUUID } from 'node:crypto';
import { Command } from '@nestjs/cqrs';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { UserEntity } from '../../domain';
import { PasswordHasher } from '../contracts/password-hasher';
import { UserRepository } from '../contracts/user.repository';
import { FilesClient } from '../../../file-module/application/contracts/files.client';
import { UserEventsPublisher } from '../contracts/user-events.publisher';

export type RegisterUserResult = {
  id: string;
  email: string;
  createdAt: Date;
};

export class RegisterUserCommand extends Command<RegisterUserResult> {
  public constructor(
    public readonly email: string,
    public readonly password: string,
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
    private readonly filesClient: FilesClient,
    private readonly userEventsPublisher: UserEventsPublisher,
  ) {}

  public async execute(
    command: RegisterUserCommand,
  ): Promise<RegisterUserResult> {
    const email = command.email.trim().toLowerCase();
    await this.ensureAvatarAvailable(command.avatarFileId);
    const passwordHash = await this.passwordHasher.hash(command.password);
    const id = randomUUID();

    const user = new UserEntity({
      id,
      email,
      passwordHash,
      avatarFileId: command.avatarFileId,
    });

    await this.userRepository.save(user);
    await this.userEventsPublisher.publishCreated({
      userId: user.id,
      avatarFileId: user.avatarFileId,
    });

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private async ensureAvatarAvailable(avatarFileId: string): Promise<void> {
    try {
      await this.filesClient.ensureUploaded(avatarFileId);
    } catch (error: unknown) {
      if (
        error instanceof DomainException &&
        error.code === DomainExceptionCode.InvalidBusinessState &&
        (await this.userRepository.findByAvatarFileId(avatarFileId)) !== null
      ) {
        throw new DomainException({
          code: DomainExceptionCode.AlreadyExists,
          message: 'This avatar file is already in use.',
          extensions: [
            {
              field: 'avatarFileId',
              message: 'This avatar file is already in use.',
            },
          ],
        });
      }

      throw error;
    }
  }
}
