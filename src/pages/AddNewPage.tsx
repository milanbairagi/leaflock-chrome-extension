import { useState, useCallback } from "react";
import { type AxiosResponse } from "axios";
import api from "../axios";
import { useAuthCredential } from "../contexts/useAuthCredential";


export interface VaultItem {
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

interface props {
  handleAddAndGoToDetail?: (newItemId: number) => void;
}
const AddNewPage = ({ handleAddAndGoToDetail }: props) => {
  const [vaultItem, setVaultItem] = useState<VaultItem>({
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();

  const fetchNewVaultItem = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);
    try {
      const res: AxiosResponse<VaultItem> = await apiInstance.post("vaults/list-create/", vaultItem);
      if (handleAddAndGoToDetail && res.data.id) handleAddAndGoToDetail(res.data.id);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage("Failed to fetch new vault item.");
      console.error("Error fetching new vault item:", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, vaultUnlockToken, setAuthTokens, vaultItem]);

  return (
    <div>
      <form onSubmit={fetchNewVaultItem}>
        title: <input type="text" value={vaultItem?.title} onChange={(e) => setVaultItem({ ...vaultItem, title: e.target.value })} /><br />
        username: <input type="text" value={vaultItem?.username} onChange={(e) => setVaultItem({ ...vaultItem, username: e.target.value })} /><br />
        password: <input type="password" value={vaultItem?.password} onChange={(e) => setVaultItem({ ...vaultItem, password: e.target.value })} /><br />
        url: <input type="text" value={vaultItem?.url} onChange={(e) => setVaultItem({ ...vaultItem, url: e.target.value })} /><br />
        notes: <textarea value={vaultItem?.notes} onChange={(e) => setVaultItem({ ...vaultItem, notes: e.target.value })} /><br />

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
        {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
      </form>
    </div>
  );
};

export default AddNewPage;
