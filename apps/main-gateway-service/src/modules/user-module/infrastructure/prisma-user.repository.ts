import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src/exceptions';
import { PrismaService } from '../../../common/prisma';
import { UserRepository } from '../application/contracts/user.repository';
import { UserEntity } from '../domain';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(user: UserEntity): Promise<void> {
    try {
      await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          avatarFileId: user.avatarFileId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
        },
      });
    } catch (error: unknown) {
      const uniqueField = this.uniqueConstraintField(error);

      if (uniqueField === 'email') {
        throw new DomainException({
          code: DomainExceptionCode.EmailAlreadyExists,
          message: 'A user with this email already exists.',
          extensions: [
            {
              field: 'email',
              message: 'A user with this email already exists.',
            },
          ],
        });
      }

      if (uniqueField === 'avatarFileId') {
        throw new DomainException({
          code: DomainExceptionCode.AlreadyExists,
          message: 'This avatar file is already in use.',
          extensions: [
            {
              field: 'avatarFileId',
              message: 'This avatar file is already in use.',
            },
          ],
        });
      }

      throw error;
    }
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (user === null) {
      return null;
    }

    return this.toEntity(user);
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    return user === null ? null : this.toEntity(user);
  }

  public async findManyByIds(ids: string[]): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: [...new Set(ids)] },
        deletedAt: null,
      },
    });

    return users.map((user) => this.toEntity(user));
  }

  private toEntity(user: {
    id: string;
    email: string;
    passwordHash: string;
    avatarFileId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): UserEntity {
    return new UserEntity({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      avatarFileId: user.avatarFileId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    });
  }

  public async findByAvatarFileId(
    avatarFileId: string,
  ): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { avatarFileId },
    });

    if (user === null) {
      return null;
    }

    return this.toEntity(user);
  }

  public async deleteAllUsersAndSessions(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.deleteMany(),
      this.prisma.user.deleteMany(),
    ]);
  }

  private uniqueConstraintField(error: unknown): string | null {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return null;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      const field = target.find(
        (value): value is string => typeof value === 'string',
      );
      return field ?? null;
    }

    return typeof target === 'string' ? target : null;
  }
}
