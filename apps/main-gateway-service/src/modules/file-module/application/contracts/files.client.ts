export type CreateFileUploadRequest = {
  fileExtension: string;
  fileSize: number;
};

export type CreateFileUploadResult = {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  fileId: string;
};

export type GetFilesResult = {
  fileId: string;
  publicUrl: string;
}[];

export abstract class FilesClient {
  public abstract createUpload(
    request: CreateFileUploadRequest,
  ): Promise<CreateFileUploadResult>;

  public abstract ensureUploaded(fileId: string): Promise<void>;

  public abstract getFiles(fileIds: string[]): Promise<GetFilesResult>;

  public abstract eraseAllData(): Promise<void>;
}
