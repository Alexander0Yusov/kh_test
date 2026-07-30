import { PostEntity } from '../../domain';

export type CreateReplyInput = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  homePage: string | null;
  parentId: string;
  message: string;
  attachmentFileId: string | null;
};

export abstract class PostRepository {
  public abstract create(post: PostEntity): Promise<void>;

  public abstract createReply(input: CreateReplyInput): Promise<PostEntity>;

  public abstract deleteAll(): Promise<void>;
}
