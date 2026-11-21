import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/decorators/roles.decorator';
import { verifyPassword } from '../../common/utils/password.util';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthPayload } from './dto/auth-payload.type';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput): Promise<AuthPayload> {
    const record = await this.usersService.findRecordByEmail(input.email);
    if (!record || !verifyPassword(input.password, record.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...user } = record;
    return this.buildAuthPayload(user);
  }

  async register(input: RegisterInput): Promise<AuthPayload> {
    const user = await this.usersService.create({
      email: input.email,
      name: input.name,
      password: input.password,
      role: UserRole.USER,
    });

    return this.buildAuthPayload(user);
  }

  private async buildAuthPayload(user: User): Promise<AuthPayload> {
    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user,
    };
  }
}

