export type RootPostSortBy = 'createdAt' | 'userName' | 'email';
export type SortDirection = 'asc' | 'desc';

export type RootPostPosition = {
  value: string;
  id: string;
};

export type FindRootPageQuery = {
  sortBy: RootPostSortBy;
  sortDirection: SortDirection;
  limitPlusOne: number;
  position: RootPostPosition | null;
};

export type RootPostPageItem = {
  id: string;
  createdAt: Date;
  userName: string;
  email: string;
};

export type PostTreeRow = {
  id: string;
  userId: string;
  parentId: string | null;
  rootId: string | null;
  path: string;
  message: string;
  userName: string;
  email: string;
  homePage: string | null;
  attachmentFileId: string | null;
  createdAt: Date;
};

export abstract class PostQueryRepository {
  public abstract findRootPage(
    query: FindRootPageQuery,
  ): Promise<RootPostPageItem[]>;

  public abstract findByRootIds(rootIds: string[]): Promise<PostTreeRow[]>;

  public abstract findById(id: string): Promise<PostTreeRow | null>;
}
