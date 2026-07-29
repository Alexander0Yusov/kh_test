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

export type RootPostSortBy = 'createdAt' | 'userName' | 'email';
export type SortDirection = 'asc' | 'desc';
export type PostOptionalField =
  'avatar' | 'userName' | 'email' | 'homePage' | 'publishDate' | 'attachment';

export type GetRootPostsInput = {
  cursor?: string;
  sortBy?: RootPostSortBy;
  sortDirection?: SortDirection;
  limit?: number;
  fields?: PostOptionalField[];
};

export type GetRootPostsResult = {
  rootIds: string[];
  nextCursor?: string;
  hasMore: boolean;
  resolvedFields: PostOptionalField[];
};

export abstract class PostsClient {
  public abstract createPost(
    request: CreatePostRequest,
  ): Promise<CreatePostResult>;

  public abstract getRootPosts(
    input: GetRootPostsInput,
  ): Promise<GetRootPostsResult>;

  public abstract eraseAllData(): Promise<void>;
}
