import { UserEntity } from '../../domain';

export abstract class UserRepository {
  public abstract save(user: UserEntity): Promise<void>;

  public abstract findByEmail(email: string): Promise<UserEntity | null>;

  public abstract findById(id: string): Promise<UserEntity | null>;

  public abstract findManyByIds(ids: string[]): Promise<UserEntity[]>;

  public abstract findByAvatarFileId(
    avatarFileId: string,
  ): Promise<UserEntity | null>;

  public abstract deleteAllUsersAndSessions(): Promise<void>;
}
