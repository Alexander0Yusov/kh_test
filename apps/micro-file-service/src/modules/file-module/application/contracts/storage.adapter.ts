export type CreatePresignedPostParams = {
  key: string;
  contentType: string;
  maxSizeBytes: number;
  expiresInSeconds: number;
};

export type PresignedPostResult = {
  uploadUrl: string;
  uploadFields: Record<string, string>;
};

export abstract class StorageAdapter {
  public abstract createPresignedPost(
    params: CreatePresignedPostParams,
  ): Promise<PresignedPostResult>;
}
