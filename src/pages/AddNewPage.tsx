import { useState, useCallback } from "react";
import { type AxiosResponse } from "axios";
import api from "../axios";
import { generateIV } from "../utils/cryptography";
import { useAuthCredential } from "../contexts/useAuthCredential";
import EditableVaultItem from "./EditableVaultItem";
import type { VaultItem, CreateVaultItemPayload } from "../types";
import { encryptVault } from "../hooks/useCryptoVault";

interface props {
  handleAddAndGoToDetail?: (newItemId: number) => void;
}
const AddNewPage = ({ handleAddAndGoToDetail }: props) => {
  const [vaultItem, setVaultItem] = useState<CreateVaultItemPayload>({
    title: "",
    username: "",
    password: "",
    iv: "",
    url: "",
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { accessToken, refreshToken, setAuthTokens, vaultUnlockKey } = useAuthCredential();

  const fetchNewVaultItem = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    const apiInstance = api(accessToken);
    try {
      if (!vaultUnlockKey) {
        throw new Error("Vault unlock key is missing.");
      }

      const iv = generateIV();
      const vaultItemWithIV = { ...vaultItem, iv };
      const encryptedVaultItem = await encryptVault(vaultItemWithIV, vaultUnlockKey);

      const res: AxiosResponse<VaultItem> = await apiInstance.post("vaults/blobs/", encryptedVaultItem);
      console.log("New vault item created:", res.data);
      if (handleAddAndGoToDetail && res.data.id) handleAddAndGoToDetail(res.data.id);
      setErrorMessage(null);

    } catch (error) {
      setErrorMessage("Failed to fetch new vault item.");
      console.error("Error fetching new vault item:", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, setAuthTokens, vaultItem, vaultUnlockKey]);

  return (
    <div>
      <EditableVaultItem
        vaultItem={vaultItem}
        setVaultItem={setVaultItem}
        onSubmit={fetchNewVaultItem}
        isEditing={false}
        loading={loading}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default AddNewPage;
