import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GatewayConfig } from '../../../common/config/gateway-config';
import {
  TokenPair,
  TokenPayload,
  TokenService,
} from '../application/contracts/token.service';

@Injectable()
export class JwtTokenService extends TokenService {
  public constructor(
    private readonly jwtService: JwtService,
    private readonly config: GatewayConfig,
  ) {
    super();
  }

  public async createTokenPair(
    userId: string,
    sessionId: string,
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          sid: sessionId,
          type: 'access',
        } satisfies TokenPayload,
        {
          secret: this.config.jwtAccessSecret,
          expiresIn: this.config.jwtAccessTtlSeconds,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          sid: sessionId,
          type: 'refresh',
        } satisfies TokenPayload,
        {
          secret: this.config.jwtRefreshSecret,
          expiresIn: this.config.jwtRefreshTtlSeconds,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  public async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    return this.verifyToken(token, 'refresh', this.config.jwtRefreshSecret);
  }

  public async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    return this.verifyToken(token, 'access', this.config.jwtAccessSecret);
  }

  private async verifyToken(
    token: string,
    type: TokenPayload['type'],
    secret: string,
  ): Promise<TokenPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret,
      });

      if (
        payload.type !== type ||
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        typeof payload.sid !== 'string' ||
        payload.sid.length === 0
      ) {
        return null;
      }

      return {
        sub: payload.sub,
        sid: payload.sid,
        type,
      };
    } catch {
      return null;
    }
  }
}
