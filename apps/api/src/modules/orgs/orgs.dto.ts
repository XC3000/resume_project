export class CreateOrgDto {
  name!: string;
  slug!: string;
}

export class UpdateOrgSettingsDto {
  name?: string;
  slug?: string;
}

export class CreateApiKeyDto {
  name!: string;
  scopes!: string[];
  expiresAt?: string;
}
