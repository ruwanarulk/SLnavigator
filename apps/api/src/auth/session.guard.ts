import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthedRequest, SessionUser } from './auth.decorators';

export const SESSION_COOKIE = 'sln_session';

/**
 * Global guard that never blocks: it reads the session cookie and attaches
 * `req.user` when valid. `@Authenticated()` does the actual gating.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; role: SessionUser['role'] }>(token);
        req.user = { id: payload.sub, role: payload.role };
      } catch {
        // Expired or tampered cookie: treat as signed out.
      }
    }
    return true;
  }
}
