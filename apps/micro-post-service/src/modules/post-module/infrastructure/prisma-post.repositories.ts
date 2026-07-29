import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';
import { PrismaService } from '../../../common/prisma';
import {
  type PostUserData,
  PostUserRepository,
} from '../application/contracts/post-user.repository';
import { PostRepository } from '../application/contracts/post.repository';
import { PostEntity } from '../domain';

@Injectable()
export class PrismaPostUserRepository extends PostUserRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async upsert(user: PostUserData): Promise<void> {
    await this.prisma.postUser.upsert({
      where: { id: user.id },
      create: user,
      update: {
        email: user.email,
        userName: user.userName,
      },
    });
  }

  public async findById(id: string): Promise<PostUserData | null> {
    return this.prisma.postUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        userName: true,
      },
    });
  }
}

@Injectable()
export class PrismaPostRepository extends PostRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async create(post: PostEntity): Promise<void> {
    try {
      await this.prisma.post.create({
        data: {
          id: post.id,
          userId: post.userId,
          parentId: post.parentId,
          rootId: post.rootId,
          childCounter: post.childCounter,
          path: post.path,
          message: post.message,
          attachmentFileId: post.attachmentFileId,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          deletedAt: post.deletedAt,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        this.isAttachmentConflict(error.meta?.target)
      ) {
        throw new DomainException({
          code: DomainExceptionCode.AlreadyExists,
          message: 'This attachment file is already in use.',
          extensions: [
            {
              field: 'attachmentFileId',
              message: 'This attachment file is already in use.',
            },
          ],
        });
      }

      throw error;
    }
  }

  private isAttachmentConflict(target: unknown): boolean {
    return Array.isArray(target)
      ? target.includes('attachmentFileId')
      : target === 'attachmentFileId' ||
          (typeof target === 'string' && target.includes('attachmentFileId'));
  }

  public async deleteAllPostsAndUsers(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.post.deleteMany(),
      this.prisma.postUser.deleteMany(),
    ]);
  }
}
