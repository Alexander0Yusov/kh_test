import { PostEntity } from '../../domain';

export abstract class PostRepository {
  public abstract create(post: PostEntity): Promise<void>;

  public abstract deleteAllPostsAndUsers(): Promise<void>;
}
