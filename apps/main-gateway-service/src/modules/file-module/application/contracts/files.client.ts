export type CreateFileUploadRequest = {
  fileExtension: string;
  fileSize: number;
};

export type CreateFileUploadResult = {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  fileId: string;
};

export abstract class FilesClient {
  public abstract createUpload(
    request: CreateFileUploadRequest,
  ): Promise<CreateFileUploadResult>;
}
