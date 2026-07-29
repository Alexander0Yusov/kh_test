export type CreatePostRequest = {
  userId: string;
  message: string;
  attachmentFileId: string | null;
  parentId: string | null;
};

export type CreatePostResult = {
  id: string;
  parentId: string | null;
  message: string;
  attachmentFileId: string | null;
  createdAt: Date;
};

export abstract class PostsClient {
  public abstract createPost(
    request: CreatePostRequest,
  ): Promise<CreatePostResult>;

  public abstract eraseAllData(): Promise<void>;
}
