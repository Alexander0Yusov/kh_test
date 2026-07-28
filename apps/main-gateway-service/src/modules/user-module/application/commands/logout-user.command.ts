import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src/exceptions';
import { SessionRepository } from '../contracts/session.repository';
import { TokenService } from '../contracts/token.service';

export class LogoutUserCommand extends Command<void> {
  public constructor(public readonly refreshToken: string) {
    super();
  }
}

@CommandHandler(LogoutUserCommand)
export class LogoutUserHandler implements ICommandHandler<
  LogoutUserCommand,
  void
> {
  public constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
  ) {}

  public async execute(command: LogoutUserCommand): Promise<void> {
    const payload = await this.tokenService.verifyRefreshToken(
      command.refreshToken,
    );

    if (payload === null) {
      throw this.unauthorized();
    }

    const session = await this.sessionRepository.findById(payload.sid);

    if (session === null) {
      return;
    }

    if (session.userId !== payload.sub) {
      throw this.unauthorized();
    }

    if (session.isRevoked || session.isExpired() || session.isDeleted) {
      return;
    }

    session.revoke();
    await this.sessionRepository.save(session);
  }

  private unauthorized(): DomainException {
    return new DomainException({
      code: DomainExceptionCode.Unauthorized,
      message: 'Invalid refresh token.',
    });
  }
}
