import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Alex Mercer', description: 'Full display name of the user' })
  name?: string;

  @ApiProperty({ example: 'alex@example.com', description: 'User email address' })
  email!: string;

  @ApiProperty({ example: 'secretPass123!', description: 'Account password' })
  password?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alex@example.com', description: 'User email address' })
  email!: string;

  @ApiProperty({ example: 'secretPass123!', description: 'Account password' })
  password?: string;
}

export class GithubAuthDto {
  @ApiPropertyOptional({ example: 'gh_code_123', description: 'GitHub OAuth temporary authorization code' })
  code?: string;
}

export class AuthUserDto {
  @ApiProperty({ example: 'usr_84920492' })
  id!: string;

  @ApiProperty({ example: 'Alex Mercer' })
  name!: string;

  @ApiProperty({ example: 'alex@example.com' })
  email!: string;

  @ApiProperty({ example: 'alexmercer' })
  username!: string;

  @ApiProperty({ example: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' })
  avatar!: string;

  @ApiProperty({ example: 'email', enum: ['email', 'github'] })
  provider!: 'github' | 'email';

  @ApiPropertyOptional({ example: 'Developer at Triage AI' })
  bio?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  location?: string;

  @ApiPropertyOptional({ example: 12 })
  publicRepos?: number;

  @ApiProperty({ example: '2026-08-11T07:10:00.000Z' })
  createdAt!: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'd9ef2f792eb8fc8e3026147baefa...' })
  token!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
