import { Injectable } from '@nestjs/common';
import { FileStatus as PrismaFileStatus } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../common/prisma';
import { FileRepository } from '../application/contracts/file.repository';
import { FileEntity, FileStatus } from '../domain';

function toPrismaStatus(status: FileStatus): PrismaFileStatus {
  switch (status) {
    case FileStatus.Pending:
      return PrismaFileStatus.PENDING;
    case FileStatus.Uploaded:
      return PrismaFileStatus.UPLOADED;
    case FileStatus.Used:
      return PrismaFileStatus.USED;
    case FileStatus.Rejected:
      return PrismaFileStatus.REJECTED;
    case FileStatus.Failed:
      return PrismaFileStatus.FAILED;
  }
}

function toDomainStatus(status: PrismaFileStatus): FileStatus {
  switch (status) {
    case PrismaFileStatus.PENDING:
      return FileStatus.Pending;
    case PrismaFileStatus.UPLOADED:
      return FileStatus.Uploaded;
    case PrismaFileStatus.USED:
      return FileStatus.Used;
    case PrismaFileStatus.REJECTED:
      return FileStatus.Rejected;
    case PrismaFileStatus.FAILED:
      return FileStatus.Failed;
  }
}

@Injectable()
export class PrismaFileRepository extends FileRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async create(file: FileEntity): Promise<void> {
    await this.prisma.file.create({
      data: {
        id: file.id,
        s3Key: file.s3Key,
        bucket: file.bucket,
        extension: file.extension,
        size: file.size,
        width: file.width,
        height: file.height,
        status: toPrismaStatus(file.status),
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        deletedAt: file.deletedAt,
      },
    });
  }

  public async findById(id: string): Promise<FileEntity | null> {
    const file = await this.prisma.file.findUnique({
      where: {
        id,
      },
    });

    if (file === null) {
      return null;
    }

    return new FileEntity({
      id: file.id,
      s3Key: file.s3Key,
      bucket: file.bucket,
      extension: file.extension,
      size: file.size,
      width: file.width,
      height: file.height,
      status: toDomainStatus(file.status),
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt,
    });
  }
}
