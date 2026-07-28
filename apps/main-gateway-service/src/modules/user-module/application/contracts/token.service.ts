export type TokenPayload = {
  sub: string;
  sid: string;
  type: 'access' | 'refresh';
};

export abstract class TokenService {
  public abstract createAccessToken(
    userId: string,
    sessionId: string,
  ): Promise<string>;

  public abstract createRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string>;

  public abstract verifyRefreshToken(
    token: string,
  ): Promise<TokenPayload | null>;
}
