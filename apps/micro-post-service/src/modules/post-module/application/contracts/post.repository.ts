export abstract class PostRepository {
  public abstract deleteAllPostsAndUsers(): Promise<void>;
}
