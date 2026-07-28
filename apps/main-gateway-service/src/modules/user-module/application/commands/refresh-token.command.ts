import { randomUUID } from 'node:crypto';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src/exceptions';
import { GatewayConfig } from '../../../../common/config/gateway-config';
import { SessionEntity } from '../../domain';
import { SessionRepository } from '../contracts/session.repository';
import { TokenPair, TokenService } from '../contracts/token.service';

export type RefreshTokenResult = TokenPair;

export class RefreshTokenCommand extends Command<RefreshTokenResult> {
  public constructor(public readonly refreshToken: string) {
    super();
  }
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<
  RefreshTokenCommand,
  RefreshTokenResult
> {
  public constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly config: GatewayConfig,
  ) {}

  public async execute(
    command: RefreshTokenCommand,
  ): Promise<RefreshTokenResult> {
    const payload = await this.tokenService.verifyRefreshToken(
      command.refreshToken,
    );

    if (payload === null) {
      throw this.unauthorized();
    }

    const previousSession = await this.sessionRepository.findById(payload.sid);

    if (
      previousSession === null ||
      previousSession.userId !== payload.sub ||
      previousSession.isRevoked ||
      previousSession.isExpired() ||
      previousSession.isDeleted
    ) {
      throw this.unauthorized();
    }

    const issuedAt = new Date();
    const nextSession = new SessionEntity({
      id: randomUUID(),
      userId: previousSession.userId,
      deviceId: previousSession.deviceId,
      deviceName: previousSession.deviceName,
      ip: previousSession.ip,
      issuedAt,
      expiresAt: new Date(
        issuedAt.getTime() + this.config.jwtRefreshTtlSeconds * 1000,
      ),
      revokedAt: null,
    });

    previousSession.revoke(issuedAt);

    const tokenPair = await this.tokenService.createTokenPair(
      nextSession.userId,
      nextSession.id,
    );
    const rotated = await this.sessionRepository.rotate(
      previousSession,
      nextSession,
    );

    if (!rotated) {
      throw this.unauthorized();
    }

    return tokenPair;
  }

  private unauthorized(): DomainException {
    return new DomainException({
      code: DomainExceptionCode.Unauthorized,
      message: 'Invalid refresh token.',
    });
  }
}
