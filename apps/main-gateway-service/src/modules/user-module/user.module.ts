import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../common/prisma';
import { FileModule } from '../file-module/file.module';
import { LoginUserHandler } from './application/commands/login-user.command';
import { LogoutUserHandler } from './application/commands/logout-user.command';
import { RefreshTokenHandler } from './application/commands/refresh-token.command';
import { RegisterUserHandler } from './application/commands/register-user.command';
import { PasswordHasher } from './application/contracts/password-hasher';
import { SessionRepository } from './application/contracts/session.repository';
import { TokenService } from './application/contracts/token.service';
import { UserRepository } from './application/contracts/user.repository';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { RabbitMqUserEventsPublisher } from './infrastructure/rabbitmq-user-events.publisher';
import { UserEventsPublisher } from './application/contracts/user-events.publisher';
import { AuthController } from './presentation/auth.controller';
import { UserController } from './presentation/user.controller';
import { JwtAccessGuard } from './presentation/access-auth';
import { GetCurrentUserHandler } from './application/queries/get-current-user.query';

@Module({
  imports: [
    CqrsModule.forRoot(),
    JwtModule.register({}),
    PrismaModule,
    FileModule,
  ],
  controllers: [UserController, AuthController],
  providers: [
    RegisterUserHandler,
    LoginUserHandler,
    LogoutUserHandler,
    RefreshTokenHandler,
    GetCurrentUserHandler,
    JwtAccessGuard,
    {
      provide: UserEventsPublisher,
      useClass: RabbitMqUserEventsPublisher,
    },
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: PasswordHasher,
      useClass: ScryptPasswordHasher,
    },
    {
      provide: SessionRepository,
      useClass: PrismaSessionRepository,
    },
    {
      provide: TokenService,
      useClass: JwtTokenService,
    },
  ],
  exports: [UserRepository],
})
export class UserModule {}
