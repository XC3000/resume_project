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

export class InviteMemberDto {
  email!: string;
  role!: string;
}

export class AcceptInviteDto {
  token!: string;
  confirm?: boolean;
}

export class TransferOwnershipDto {
  targetMemberId!: string;
  confirm?: boolean;
}
