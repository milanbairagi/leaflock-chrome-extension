export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type CreateUserPayload = Omit<
  User,
  "id" | "created_at" | "updated_at"
>;

export type Vault = {
  id: number;
  user: number;
  encrypted_blob: string;
  iv: string;
  version: number;
  updated_at: string;
};

export type VaultItem = {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  extra_fields: ExtraFields[];
  notes: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateVaultItemPayload = Omit<VaultItem, "id">

type ExtraFields = {
  title?: string;
  value?: string;
  isHidden?: boolean;
};

export type StorageArea = "local" | "session";