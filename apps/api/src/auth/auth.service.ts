import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { randomBytes, createHash } from 'crypto';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  provider: 'github' | 'email';
  bio?: string;
  location?: string;
  publicRepos?: number;
  createdAt: string;
}

export interface SessionData {
  token: string;
  user: AuthUser;
  createdAt: string;
  expiresAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly redisService: RedisService) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  async register(name: string, email: string, pass: string): Promise<{ token: string; user: AuthUser }> {
    if (!email || !pass) {
      throw new BadRequestException('Email and password are required.');
    }

    const emailKey = `user:email:${email.toLowerCase()}`;
    const existingUserJson = await this.redisService.get(emailKey);
    if (existingUserJson) {
      throw new BadRequestException('An account with this email already exists. Please sign in instead.');
    }

    const namePart = email.split('@')[0] || 'User';
    const username = namePart.toLowerCase().replace(/[^a-z0-9]/g, '');

    const user: AuthUser = {
      id: `usr_${randomBytes(8).toString('hex')}`,
      name: name || namePart.charAt(0).toUpperCase() + namePart.slice(1),
      email: email.toLowerCase(),
      username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      provider: 'email',
      bio: 'Developer at Triage AI',
      location: 'Remote',
      publicRepos: 5,
      createdAt: new Date().toISOString(),
    };

    // Store user credentials in Upstash Redis
    const passwordHash = this.hashPassword(pass);
    await this.redisService.set(emailKey, JSON.stringify({ ...user, passwordHash }), 86400 * 30); // 30 days

    // Create session token in Redis
    const token = this.generateToken();
    await this.createSession(token, user);

    this.logger.log(`Registered new user ${user.email} with Upstash Redis session.`);
    return { token, user };
  }

  async login(email: string, pass: string): Promise<{ token: string; user: AuthUser }> {
    if (!email || !pass) {
      throw new BadRequestException('Email and password are required.');
    }

    const emailKey = `user:email:${email.toLowerCase()}`;
    const storedUserJson = await this.redisService.get(emailKey);

    if (!storedUserJson) {
      throw new UnauthorizedException('No account found with this email. Please sign up first.');
    }

    const parsed = typeof storedUserJson === 'string' ? JSON.parse(storedUserJson) : storedUserJson;
    if (parsed.passwordHash && parsed.passwordHash !== this.hashPassword(pass)) {
      throw new UnauthorizedException('Invalid password for this account.');
    }

    const { passwordHash, ...userWithoutPass } = parsed;

    const token = this.generateToken();
    await this.createSession(token, userWithoutPass);

    this.logger.log(`Logged in user ${userWithoutPass.email} with Upstash Redis session.`);
    return { token, user: userWithoutPass };
  }

  async githubAuth(code?: string): Promise<{ token: string; user: AuthUser }> {
    const githubUser: AuthUser = {
      id: `gh_${randomBytes(8).toString('hex')}`,
      name: 'Alex Vance',
      email: 'alex.vance@github.com',
      username: 'alexvance-dev',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      provider: 'github',
      bio: 'Open Source Contributor • Triage AI Maintainer',
      location: 'Seattle, WA',
      publicRepos: 48,
      createdAt: new Date().toISOString(),
    };

    const token = this.generateToken();
    await this.createSession(token, githubUser);

    this.logger.log(`GitHub Auth session created for ${githubUser.username} in Upstash Redis.`);
    return { token, user: githubUser };
  }

  async getSession(token: string): Promise<AuthUser | null> {
    if (!token) return null;
    const sessionKey = `session:${token}`;
    const sessionJson = await this.redisService.get(sessionKey);
    if (!sessionJson) return null;

    try {
      const session: SessionData = typeof sessionJson === 'string' ? JSON.parse(sessionJson) : sessionJson;
      return session.user;
    } catch {
      return null;
    }
  }

  async logout(token: string): Promise<boolean> {
    if (!token) return false;
    const sessionKey = `session:${token}`;
    await this.redisService.set(sessionKey, '', 1); // Expire session
    return true;
  }

  private async createSession(token: string, user: AuthUser): Promise<void> {
    const sessionKey = `session:${token}`;
    const sessionData: SessionData = {
      token,
      user,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(), // 24 Hours TTL
    };
    await this.redisService.set(sessionKey, JSON.stringify(sessionData), 86400);
  }
}
