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

export type StorageObjectMetadata = {
  size: number;
  contentType: string | null;
};

export class StorageObjectTooLargeError extends Error {
  public constructor() {
    super('Storage object exceeds the permitted read size.');
    this.name = StorageObjectTooLargeError.name;
  }
}

export abstract class StorageAdapter {
  public abstract createPresignedPost(
    params: CreatePresignedPostParams,
  ): Promise<PresignedPostResult>;

  public abstract headObject(
    key: string,
  ): Promise<StorageObjectMetadata | null>;

  public abstract getObject(
    key: string,
    maxSizeBytes: number,
  ): Promise<Uint8Array | null>;

  public abstract deleteObject(key: string): Promise<void>;
}
