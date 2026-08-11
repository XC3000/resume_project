import { Controller, Post, Get, Body, Req, Res, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RegisterDto, LoginDto, GithubAuthDto, AuthResponseDto, LogoutResponseDto } from './dto/auth.dto';
import { Request, Response } from 'express';

const COOKIE_NAME = 'triage_ai_session';

@ApiTags('Authentication & Sessions')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Get GitHub OAuth authorization URL' })
  @Get('github/url')
  getGithubUrl() {
    const clientId = process.env.GITHUB_CLIENT_ID || 'Iv23lifsMCvY59WADoB6';
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'https://8a91-2409-40e0-11c4-1859-d49f-f196-77a6-baaf.ngrok-free.app/api/auth/github/callback';
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email`;
    return { url, clientId, callbackUrl };
  }

  @ApiOperation({ summary: 'GitHub OAuth Callback Endpoint' })
  @ApiQuery({ name: 'code', required: true })
  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.redirect('/signin?error=github_no_code');
    }
    try {
      const result = await this.authService.githubAuth(code);
      this.setSessionCookie(res, result.token);
      return res.redirect('/dashboard');
    } catch (err) {
      return res.redirect('/signin?error=github_auth_failed');
    }
  }

  @ApiOperation({ summary: 'Register a new user account', description: 'Creates a user, establishes Upstash Redis session, and sets session cookie.' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Email already exists or invalid data' })
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(body.name || '', body.email, body.password || '');
    this.setSessionCookie(res, result.token);
    return result;
  }

  @ApiOperation({ summary: 'Sign in to an existing account', description: 'Verifies credentials against Upstash Redis and sets session cookie.' })
  @ApiResponse({ status: 200, description: 'User authenticated successfully', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'No account found or invalid credentials' })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(body.email, body.password || '');
    this.setSessionCookie(res, result.token);
    return result;
  }

  @ApiOperation({ summary: 'Authenticate via GitHub OAuth', description: 'Exchanges GitHub authorization code for user session.' })
  @ApiResponse({ status: 200, description: 'GitHub authentication successful', type: AuthResponseDto })
  @Post('github')
  async githubAuth(
    @Body() body: GithubAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.githubAuth(body?.code);
    this.setSessionCookie(res, result.token);
    return result;
  }

  @ApiOperation({ summary: 'Get current user session profile', description: 'Fetches active user details from Upstash Redis using session cookie.' })
  @ApiCookieAuth(COOKIE_NAME)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Active session profile', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated or expired session' })
  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: any): Promise<AuthResponseDto> {
    return { user: req.user, token: req.sessionToken };
  }

  @ApiOperation({ summary: 'Fetch active session state', description: 'Alias for /me endpoint used by frontend SDK.' })
  @ApiCookieAuth(COOKIE_NAME)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Active session profile', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated or expired session' })
  @UseGuards(AuthGuard)
  @Get('session')
  async getSession(@Req() req: any): Promise<AuthResponseDto> {
    return { user: req.user, token: req.sessionToken };
  }

  @ApiOperation({ summary: 'Logout & clear session', description: 'Invalidates session token in Upstash Redis and clears session cookie.' })
  @ApiCookieAuth(COOKIE_NAME)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Logout successful', type: LogoutResponseDto })
  @Post('logout')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const token = req.cookies?.[COOKIE_NAME] || req.headers?.authorization?.replace('Bearer ', '') || req.sessionToken;
    if (token) {
      await this.authService.logout(token);
    }
    this.clearSessionCookie(res);
    return { success: true };
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      path: '/',
      maxAge: 86400 * 1000, // 24 Hours
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  private clearSessionCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.cookie(COOKIE_NAME, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'lax',
    });
  }
}
