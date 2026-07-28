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
      if (this.isEmailUniqueConstraint(error)) {
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

  private isEmailUniqueConstraint(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.target;

    return (
      (Array.isArray(target) && target.includes('email')) ||
      (typeof target === 'string' && target.includes('email')) ||
      error.message.includes('(`email`)')
    );
  }
}
