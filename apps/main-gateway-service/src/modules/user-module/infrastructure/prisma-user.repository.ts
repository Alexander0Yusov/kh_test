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
          userName: user.userName,
          passwordHash: user.passwordHash,
          homePage: user.homePage,
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

  private toEntity(user: {
    id: string;
    email: string;
    userName: string;
    passwordHash: string;
    homePage: string;
    avatarFileId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): UserEntity {
    return new UserEntity({
      id: user.id,
      email: user.email,
      userName: user.userName,
      passwordHash: user.passwordHash,
      homePage: user.homePage,
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
