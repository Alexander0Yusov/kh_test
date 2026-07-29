import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { FilesConfig } from '../../../../common/config/files-config';
import { FileStatus } from '../../domain';
import { FileRepository } from '../contracts/file.repository';
import { StorageAdapter } from '../contracts/storage.adapter';

export class GetFilesQuery {
  public constructor(public readonly fileIds: string[]) {}
}

export type GetFilesResult = {
  files: {
    fileId: string;
    status: FileStatus;
    publicUrl: string;
  }[];
};

@QueryHandler(GetFilesQuery)
export class GetFilesHandler implements IQueryHandler<
  GetFilesQuery,
  GetFilesResult
> {
  public constructor(
    private readonly fileRepository: FileRepository,
    private readonly storageAdapter: StorageAdapter,
    private readonly config: FilesConfig,
  ) {}

  public async execute(query: GetFilesQuery): Promise<GetFilesResult> {
    const fileIds = [...new Set(query.fileIds)];

    if (fileIds.length === 0) {
      return { files: [] };
    }

    const files = (await this.fileRepository.findManyByIds(fileIds)).filter(
      (file) =>
        file.status === FileStatus.Uploaded || file.status === FileStatus.Used,
    );

    return {
      files: await Promise.all(
        files.map(async (file) => ({
          fileId: file.id,
          status: file.status,
          publicUrl: await this.storageAdapter.createDownloadUrl(
            file.s3Key,
            this.config.downloadUrlTtlSeconds,
          ),
        })),
      ),
    };
  }
}
