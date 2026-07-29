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
import {
  type CreateReplyInput,
  PostRepository,
} from '../application/contracts/post.repository';
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
      await this.prisma.post.create({ data: this.toCreateData(post) });
    } catch (error: unknown) {
      this.throwCreateError(error);
    }
  }

  public async createReply(input: CreateReplyInput): Promise<PostEntity> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const parentRecord = await transaction.post.findUnique({
          where: { id: input.parentId },
        });

        if (parentRecord === null) {
          throw new DomainException({
            code: DomainExceptionCode.NotFound,
            message: 'Parent post was not found.',
            extensions: [
              { field: 'parentId', message: 'Parent post was not found.' },
            ],
          });
        }

        if (parentRecord.deletedAt !== null) {
          throw new DomainException({
            code: DomainExceptionCode.InvalidBusinessState,
            message: 'Cannot reply to a deleted post.',
            extensions: [
              { field: 'parentId', message: 'Cannot reply to a deleted post.' },
            ],
          });
        }

        const incrementedParent = await transaction.post.update({
          where: { id: input.parentId },
          data: { childCounter: { increment: 1 } },
        });
        const parent = this.toEntity(incrementedParent);
        const reply = new PostEntity({
          id: input.id,
          userId: input.userId,
          parentId: parent.id,
          rootId: parent.rootId ?? parent.id,
          path: parent.buildChildPath(incrementedParent.childCounter),
          childCounter: 0,
          message: input.message,
          attachmentFileId: input.attachmentFileId,
        });

        await transaction.post.create({ data: this.toCreateData(reply) });
        return reply;
      });
    } catch (error: unknown) {
      this.throwCreateError(error);
    }
  }

  private toEntity(post: {
    id: string;
    userId: string;
    parentId: string | null;
    rootId: string | null;
    childCounter: number;
    path: string;
    message: string;
    attachmentFileId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): PostEntity {
    return new PostEntity(post);
  }

  private toCreateData(post: PostEntity): Prisma.PostUncheckedCreateInput {
    return {
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
    };
  }

  private throwCreateError(error: unknown): never {
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
