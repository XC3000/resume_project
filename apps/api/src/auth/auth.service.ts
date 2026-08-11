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
    if (!code) {
      throw new BadRequestException('GitHub authorization code is required for authentication.');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'https://8a91-2409-40e0-11c4-1859-d49f-f196-77a6-baaf.ngrok-free.app/api/auth/github/callback';

    if (!clientId || !clientSecret || clientId === 'YOUR_GITHUB_CLIENT_ID') {
      throw new BadRequestException('GitHub OAuth credentials are not properly configured on server.');
    }

    this.logger.log(`Exchanging GitHub OAuth code with GitHub API...`);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      this.logger.error(`GitHub token exchange error: ${JSON.stringify(tokenData)}`);
      throw new UnauthorizedException(tokenData.error_description || 'GitHub OAuth authorization failed.');
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub API
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Triage-AI-App',
      },
    });
    const profile = await profileRes.json();

    if (!profile || !profile.id) {
      throw new UnauthorizedException('Failed to retrieve GitHub user profile.');
    }

    // Fetch user emails if profile email is null
    let primaryEmail = profile.email;
    if (!primaryEmail) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Triage-AI-App',
          },
        });
        const emails = await emailsRes.json();
        if (Array.isArray(emails)) {
          const primary = emails.find((e: any) => e.primary) || emails[0];
          if (primary?.email) primaryEmail = primary.email;
        }
      } catch (e) {
        this.logger.warn(`Could not fetch GitHub user emails: ${(e as Error).message}`);
      }
    }

    const userEmail = (primaryEmail || `${profile.login}@users.noreply.github.com`).toLowerCase();

    const githubUser: AuthUser = {
      id: `gh_${profile.id}`,
      name: profile.name || profile.login,
      email: userEmail,
      username: profile.login,
      avatar: profile.avatar_url,
      provider: 'github',
      bio: profile.bio || 'GitHub Authenticated User',
      location: profile.location || 'Remote',
      publicRepos: profile.public_repos || 0,
      createdAt: new Date().toISOString(),
    };

    // Save user in Upstash Redis
    const emailKey = `user:email:${userEmail}`;
    await this.redisService.set(emailKey, JSON.stringify(githubUser), 86400 * 30);

    const token = this.generateToken();
    await this.createSession(token, githubUser);

    this.logger.log(`Live GitHub OAuth authenticated user ${githubUser.username} (${githubUser.email}).`);
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
