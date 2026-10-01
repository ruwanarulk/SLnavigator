import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../provider/provider.service';
import type { LoginDto, RegisterDto, RegisterProviderDto } from './auth.dto';

const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12);

type UserWithProvider = User & { provider?: { id: string; type: string; verificationStatus: string } | null };

export function publicUser(u: UserWithProvider) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    currency: u.currency,
    language: u.language,
    interests: u.interests,
    provider: u.provider ? { id: u.provider.id, type: u.provider.type, verificationStatus: u.provider.verificationStatus } : null,
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
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { provider: true } });
    // Compare against a dummy hash when the user is missing so timing doesn't reveal accounts.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) throw new UnauthorizedException('Email or password is incorrect');
    return user;
  }

  /** A guide, company or driver account: the user plus a profile that starts invisible and unverified. */
  async registerProvider(dto: RegisterProviderDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name.trim(),
        passwordHash,
        role: dto.type,
        provider: {
          create: {
            slug: slugify(dto.displayName),
            type: dto.type,
            displayName: dto.displayName.trim(),
            city: dto.city.trim(),
            phone: dto.phone.trim(),
            bio: '',
            languages: ['English'],
            specialties: [],
            areas: [],
          },
        },
      },
      include: { provider: true },
    });
  }

  sign(user: Pick<User, 'id' | 'role'>) {
    return this.jwt.signAsync({ sub: user.id, role: user.role });
  }
}
