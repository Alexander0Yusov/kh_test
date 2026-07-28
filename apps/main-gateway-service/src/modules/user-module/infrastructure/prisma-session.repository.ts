import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma';
import { SessionRepository } from '../application/contracts/session.repository';
import { SessionEntity } from '../domain';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(session: SessionEntity): Promise<void> {
    const data = {
      userId: session.userId,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      ip: session.ip,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      deletedAt: session.deletedAt,
    };

    await this.prisma.session.upsert({
      where: {
        id: session.id,
      },
      create: {
        id: session.id,
        ...data,
      },
      update: data,
    });
  }

  public async findById(id: string): Promise<SessionEntity | null> {
    const session = await this.prisma.session.findUnique({
      where: {
        id,
      },
    });

    if (session === null) {
      return null;
    }

    return new SessionEntity({
      id: session.id,
      userId: session.userId,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      ip: session.ip,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      deletedAt: session.deletedAt,
    });
  }
}
