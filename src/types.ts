export type VaultItem = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;

  // Optional fields
  id?: number;
  created_at?: string;
  updated_at?: string;
};
