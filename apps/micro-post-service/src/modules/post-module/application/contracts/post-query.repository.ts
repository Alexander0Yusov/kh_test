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

export abstract class PostQueryRepository {
  public abstract findRootPage(
    query: FindRootPageQuery,
  ): Promise<RootPostPageItem[]>;
}
