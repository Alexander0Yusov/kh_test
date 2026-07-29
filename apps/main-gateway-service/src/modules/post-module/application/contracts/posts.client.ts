export type CreateRootPostRequest = {
  userId: string;
  message: string;
  attachmentFileId: string | null;
};

export type CreateRootPostResult = {
  id: string;
  message: string;
  attachmentFileId: string | null;
  createdAt: Date;
};

export abstract class PostsClient {
  public abstract createRootPost(
    request: CreateRootPostRequest,
  ): Promise<CreateRootPostResult>;

  public abstract eraseAllData(): Promise<void>;
}
