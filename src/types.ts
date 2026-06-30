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

export type VaultItem = {
  id: number;
  title: string;
  username: string;
  password: string;
  iv: string;
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CreateVaultItemPayload = Omit<
  VaultItem,
  "id" | "created_at" | "updated_at"
> & {
  password: string;
};

export type StorageArea = "local" | "session";