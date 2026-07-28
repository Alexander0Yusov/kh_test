export abstract class PasswordHasher {
  public abstract hash(password: string): Promise<string>;

  public abstract verify(
    password: string,
    passwordHash: string,
  ): Promise<boolean>;
}
