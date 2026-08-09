export interface PlanLimitConfig {
  dailyTokenCap: number;
  maxProjects: number;
  maxMembers: number;
  maxKeys: number;
}

export const PLAN_CONFIGS: Record<'FREE' | 'PRO', PlanLimitConfig> = {
  FREE: {
    dailyTokenCap: 100000,     // 100k daily tokens
    maxProjects: 3,            // Max 3 connected projects
    maxMembers: 5,             // Max 5 workspace members
    maxKeys: 3,                // Max 3 active API keys
  },
  PRO: {
    dailyTokenCap: 5000000,    // 5M daily tokens
    maxProjects: 50,           // Max 50 connected projects
    maxMembers: 100,           // Max 100 workspace members
    maxKeys: 50,               // Max 50 active API keys
  },
};
