import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../common/prisma';
import { LoginUserHandler } from './application/commands/login-user.command';
import { LogoutUserHandler } from './application/commands/logout-user.command';
import { RegisterUserHandler } from './application/commands/register-user.command';
import { PasswordHasher } from './application/contracts/password-hasher';
import { SessionRepository } from './application/contracts/session.repository';
import { TokenService } from './application/contracts/token.service';
import { UserRepository } from './application/contracts/user.repository';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { AuthController } from './presentation/auth.controller';
import { UserController } from './presentation/user.controller';

@Module({
  imports: [CqrsModule.forRoot(), JwtModule.register({}), PrismaModule],
  controllers: [UserController, AuthController],
  providers: [
    RegisterUserHandler,
    LoginUserHandler,
    LogoutUserHandler,
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
})
export class UserModule {}
