import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { UserOtpVerification } from './entities/user-otp-verification.entity';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([UserOtpVerification])],
  providers: [AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
