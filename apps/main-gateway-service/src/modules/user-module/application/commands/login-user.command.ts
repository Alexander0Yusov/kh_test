import { randomUUID } from 'node:crypto';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src/exceptions';
import { GatewayConfig } from '../../../../common/config/gateway-config';
import { SessionEntity } from '../../domain';
import { PasswordHasher } from '../contracts/password-hasher';
import { SessionRepository } from '../contracts/session.repository';
import { TokenPair, TokenService } from '../contracts/token.service';
import { UserRepository } from '../contracts/user.repository';

export type LoginUserResult = TokenPair;

export class LoginUserCommand extends Command<LoginUserResult> {
  public constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly deviceId: string,
    public readonly deviceName: string,
    public readonly ip: string,
  ) {
    super();
  }
}

@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<
  LoginUserCommand,
  LoginUserResult
> {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly config: GatewayConfig,
  ) {}

  public async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    const email = command.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (user === null) {
      throw this.invalidCredentials();
    }

    const passwordIsValid = await this.passwordHasher.verify(
      command.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw this.invalidCredentials();
    }

    const issuedAt = new Date();
    const session = new SessionEntity({
      id: randomUUID(),
      userId: user.id,
      deviceId: command.deviceId,
      deviceName: command.deviceName,
      ip: command.ip,
      issuedAt,
      expiresAt: new Date(
        issuedAt.getTime() + this.config.jwtRefreshTtlSeconds * 1000,
      ),
      revokedAt: null,
    });

    await this.sessionRepository.save(session);

    return this.tokenService.createTokenPair(user.id, session.id);
  }

  private invalidCredentials(): DomainException {
    return new DomainException({
      code: DomainExceptionCode.Unauthorized,
      message: 'Invalid email or password.',
    });
  }
}
