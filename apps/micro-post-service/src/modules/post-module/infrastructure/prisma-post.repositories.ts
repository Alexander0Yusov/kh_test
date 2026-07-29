import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma';
import {
  type PostUserData,
  PostUserRepository,
} from '../application/contracts/post-user.repository';
import { PostRepository } from '../application/contracts/post.repository';

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
}

@Injectable()
export class PrismaPostRepository extends PostRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async deleteAllPostsAndUsers(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.post.deleteMany(),
      this.prisma.postUser.deleteMany(),
    ]);
  }
}
