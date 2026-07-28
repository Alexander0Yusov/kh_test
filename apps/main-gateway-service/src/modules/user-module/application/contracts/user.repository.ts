import { UserEntity } from '../../domain';

export abstract class UserRepository {
  public abstract save(user: UserEntity): Promise<void>;

  public abstract findByEmail(email: string): Promise<UserEntity | null>;
}
