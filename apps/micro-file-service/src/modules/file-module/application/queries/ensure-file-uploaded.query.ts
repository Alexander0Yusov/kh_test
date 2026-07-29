import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import { FileStatus } from '../../domain';
import { FileRepository } from '../contracts/file.repository';

export class EnsureFileUploadedQuery {
  public constructor(public readonly fileId: string) {}
}

export type EnsureFileUploadedResult = {
  fileId: string;
};

@QueryHandler(EnsureFileUploadedQuery)
export class EnsureFileUploadedHandler implements IQueryHandler<
  EnsureFileUploadedQuery,
  EnsureFileUploadedResult
> {
  public constructor(private readonly fileRepository: FileRepository) {}

  public async execute(
    query: EnsureFileUploadedQuery,
  ): Promise<EnsureFileUploadedResult> {
    const file = await this.fileRepository.findById(query.fileId);

    if (file === null) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Avatar file was not found.',
        extensions: [
          { field: 'fileId', message: 'Avatar file was not found.' },
        ],
      });
    }

    if (file.status !== FileStatus.Uploaded) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Avatar file is not ready.',
        extensions: [{ field: 'fileId', message: 'Avatar file is not ready.' }],
      });
    }

    return { fileId: file.id };
  }
}
