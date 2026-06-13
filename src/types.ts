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

export type VaultItemFull = {
  id: number;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
};