import { PostEntity } from '../../domain';

export type CreateReplyInput = {
  id: string;
  userId: string;
  parentId: string;
  message: string;
  attachmentFileId: string | null;
};

export abstract class PostRepository {
  public abstract create(post: PostEntity): Promise<void>;

  public abstract createReply(input: CreateReplyInput): Promise<PostEntity>;

  public abstract deleteAllPostsAndUsers(): Promise<void>;
}
