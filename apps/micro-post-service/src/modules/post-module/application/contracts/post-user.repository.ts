export type PostUserData = {
  id: string;
  email: string;
  userName: string;
};

export abstract class PostUserRepository {
  public abstract upsert(user: PostUserData): Promise<void>;
}
