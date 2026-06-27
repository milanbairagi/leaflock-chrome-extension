import { useState, useCallback } from "react";
import { type AxiosResponse } from "axios";
import api from "../axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import EditableVaultItem from "./EditableVaultItem";
import type { VaultItem, CreateVaultItemPayload } from "../types";

interface props {
  handleAddAndGoToDetail?: (newItemId: number) => void;
}
const AddNewPage = ({ handleAddAndGoToDetail }: props) => {
  const [vaultItem, setVaultItem] = useState<CreateVaultItemPayload>({
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { accessToken, refreshToken, setAuthTokens } = useAuthCredential();

  const fetchNewVaultItem = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    const apiInstance = api(accessToken);
    try {
      const res: AxiosResponse<VaultItem> = await apiInstance.post("vaults/blobs/", vaultItem);
      if (handleAddAndGoToDetail && res.data.id) handleAddAndGoToDetail(res.data.id);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage("Failed to fetch new vault item.");
      console.error("Error fetching new vault item:", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, setAuthTokens, vaultItem]);

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
