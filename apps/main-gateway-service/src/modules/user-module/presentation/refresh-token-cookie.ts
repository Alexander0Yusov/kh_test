import type { CookieOptions, Request, Response } from 'express';
import { GatewayConfig } from '../../../common/config/gateway-config';
import { CoreConfig } from '../../../../../../libs/common/src/config';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

function cookieOptions(coreConfig: CoreConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: coreConfig.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  };
}

export function readRefreshTokenCookie(request: Request): string | undefined {
  const cookies = request.cookies as unknown;

  if (typeof cookies !== 'object' || cookies === null) {
    return undefined;
  }

  const token = (cookies as Record<string, unknown>)[REFRESH_TOKEN_COOKIE_NAME];

  return typeof token === 'string' ? token : undefined;
}

export function setRefreshTokenCookie(
  response: Response,
  token: string,
  coreConfig: CoreConfig,
  gatewayConfig: GatewayConfig,
): void {
  response.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...cookieOptions(coreConfig),
    maxAge: gatewayConfig.jwtRefreshTtlSeconds * 1000,
  });
}

export function clearRefreshTokenCookie(
  response: Response,
  coreConfig: CoreConfig,
): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions(coreConfig));
}
