import { Body, Controller, Get, HttpCode, NotFoundException, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Authenticated, CurrentUser, type SessionUser } from './auth.decorators';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService, publicUser } from './auth.service';
import { SESSION_COOKIE } from './session.guard';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto);
    await this.setSession(res, user);
    return publicUser(user);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto);
    await this.setSession(res, user);
    return publicUser(user);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  @Authenticated()
  async me(@CurrentUser() session: SessionUser) {
    const user = await this.prisma.user.findUnique({ where: { id: session.id } });
    if (!user) throw new NotFoundException();
    return publicUser(user);
  }

  private async setSession(res: Response, user: { id: string; role: SessionUser['role'] }) {
    res.cookie(SESSION_COOKIE, await this.auth.sign(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: THIRTY_DAYS_MS,
      path: '/',
    });
  }
}
