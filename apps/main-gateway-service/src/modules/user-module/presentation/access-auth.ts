import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';
import { SessionRepository } from '../application/contracts/session.repository';
import { TokenService } from '../application/contracts/token.service';

export type AuthenticatedUser = {
  userId: string;
  sessionId: string;
};

type AuthenticatedRequest = Request & {
  authenticatedUser?: AuthenticatedUser;
};

@Injectable()
export class JwtAccessGuard implements CanActivate {
  public constructor(
    private readonly tokenService: TokenService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const token = this.bearerToken(request);
      const payload =
        token === null
          ? null
          : await this.tokenService.verifyAccessToken(token);

      if (payload === null) {
        throw this.unauthorized();
      }

      const session = await this.sessionRepository.findById(payload.sid);

      if (
        session === null ||
        session.userId !== payload.sub ||
        !session.isActive()
      ) {
        throw this.unauthorized();
      }

      request.authenticatedUser = {
        userId: payload.sub,
        sessionId: payload.sid,
      };
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private bearerToken(request: Request): string | null {
    const [scheme, token, extra] =
      request.headers.authorization?.split(' ') ?? [];

    return scheme === 'Bearer' &&
      token !== undefined &&
      token.length > 0 &&
      extra === undefined
      ? token
      : null;
  }

  private unauthorized(): DomainException {
    return new DomainException({
      code: DomainExceptionCode.Unauthorized,
      message: 'Unauthorized.',
    });
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.authenticatedUser!;
  },
);
