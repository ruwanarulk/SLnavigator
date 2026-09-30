import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './auth.dto';

const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12);

export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    currency: u.currency,
    language: u.language,
    interests: u.interests,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({ data: { email: dto.email, name: dto.name.trim(), passwordHash } });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Compare against a dummy hash when the user is missing so timing doesn't reveal accounts.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) throw new UnauthorizedException('Email or password is incorrect');
    return user;
  }

  sign(user: Pick<User, 'id' | 'role'>) {
    return this.jwt.signAsync({ sub: user.id, role: user.role });
  }
}
