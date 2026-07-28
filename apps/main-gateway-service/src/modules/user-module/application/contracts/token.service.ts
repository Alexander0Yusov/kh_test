export type TokenPayload = {
  sub: string;
  sid: string;
  type: 'access' | 'refresh';
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export abstract class TokenService {
  public abstract createTokenPair(
    userId: string,
    sessionId: string,
  ): Promise<TokenPair>;

  public abstract verifyRefreshToken(
    token: string,
  ): Promise<TokenPayload | null>;
}
