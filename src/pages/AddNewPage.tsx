import { useState, useCallback } from "react";
// import { type AxiosResponse } from "axios";
// import api from "../axios";
import { generateIV } from "../utils/cryptography";
import { useAuthCredential } from "../contexts/useAuthCredential";
import EditableVaultItem from "./EditableVaultItem";
import type { VaultItem } from "../types";
import { sendServiceMessage } from "../hooks/useServiceMessage";

interface props {
  handleAddAndGoToDetail?: (newItemId: string) => void;
}
const AddNewPage = ({  }: props) => {
  const [vaultItem, setVaultItem] = useState<VaultItem>({
    id: "",
    title: "",
    username: "",
    password: "",
    url: "",
    extra_fields: [],
    notes: "",
    created_at: "",
    updated_at: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { accessToken, refreshToken, setAuthTokens, hasUnlockKey } = useAuthCredential();

  const fetchNewVaultItem = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken || !refreshToken || !hasUnlockKey) {
      setErrorMessage("Missing authentication or vault unlock key.");
      return;
    }

    setLoading(true);
    // const apiInstance = api(accessToken);
    try {
      if (!hasUnlockKey) {
        throw new Error("Vault unlock key is missing.");
      }

      const iv = generateIV();
      const vaultItemWithIV = { ...vaultItem, iv };
      const swResponse = await sendServiceMessage({
        type: "ENCRYPT_VAULT_ITEM",
        payload: { 
          vault: vaultItemWithIV
        },
      });
      
      if (!swResponse.success) {
        throw new Error(swResponse.error || "Failed to encrypt vault item.");
      }

      // const encryptedVaultItem = swResponse.blob as CreateVaultItemPayload;
      

      // const res: AxiosResponse<VaultItem> = await apiInstance.post("vaults/blobs/", encryptedVaultItem);
      // console.log("New vault item created:", res.data);
      // if (handleAddAndGoToDetail && res.data.id) handleAddAndGoToDetail(res.data.id);
      setErrorMessage(null);

    } catch (error) {
      setErrorMessage("Failed to fetch new vault item.");
      console.error("Error fetching new vault item:", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, setAuthTokens, vaultItem, hasUnlockKey]);

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
