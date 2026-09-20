import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@smart-anchor/database';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.get<string>('AUTH_SECRET') || 'replace-with-a-long-random-secret';
  }

  // ── Register with email + password ─────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name || null,
        passwordHash,
        accounts: {
          create: {
            provider: 'credentials',
            providerAccountId: dto.email,
          },
        },
      },
    });

    return this.issueToken(user.id, user.email);
  }

  // ── Login with email + password ────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueToken(user.id, user.email);
  }

  // ── Google OAuth login ─────────────────────────────────────────────────────
  async googleLogin(idToken: string) {
    const payload = await this.verifyGoogleToken(idToken);

    // Upsert user
    let user = await this.prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || null,
          avatarUrl: payload.picture || null,
          accounts: {
            create: {
              provider: 'google',
              providerAccountId: payload.sub,
            },
          },
        },
      });
    } else {
      // Ensure google account is linked
      const account = await this.prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: payload.sub,
          },
        },
      });

      if (!account) {
        await this.prisma.account.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerAccountId: payload.sub,
          },
        });
      }

      // Update avatar / name if changed
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: payload.picture || user.avatarUrl,
          name: payload.name || user.name,
        },
      });
    }

    return this.issueToken(user.id, user.email);
  }

  // ── Get current user ──────────────────────────────────────────────────────
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  // ── Password Reset ─────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { success: true, message: 'If that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // In a real app, send an email here using a service like Resend or SendGrid.
    // Since we don't have an email provider configured, we'll log it for development.
    console.log(`[PASSWORD RESET LINK]: /auth/reset-password?token=${resetToken}`);

    return { success: true, message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // expiry must be in the future
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired password reset token.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { success: true, message: 'Password has been successfully reset.' };
  }

  // ── Verify JWT token ──────────────────────────────────────────────────────
  verifyToken(token: string): { sub: string; email: string } {
    try {
      return jwt.verify(token, this.jwtSecret) as { sub: string; email: string };
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private issueToken(userId: string, email: string) {
    const token = jwt.sign({ sub: userId, email }, this.jwtSecret, {
      expiresIn: '7d',
    });

    return { token, user: { id: userId, email } };
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!res.ok) {
        throw new UnauthorizedException('Invalid Google token.');
      }
      const data = await res.json();

      if (!data.email || !data.sub) {
        throw new UnauthorizedException('Google token missing required claims.');
      }

      return {
        sub: data.sub,
        email: data.email,
        email_verified: data.email_verified === 'true',
        name: data.name,
        picture: data.picture,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Failed to verify Google token.');
    }
  }
}
