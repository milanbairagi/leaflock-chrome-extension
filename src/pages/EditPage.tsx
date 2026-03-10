import { useState, useCallback, useEffect } from "react";
import { type AxiosResponse } from "axios";
import type { VaultItem } from "./AddNewPage";
import api from "../axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import Button from "../components/buttons/Button";
import EditableVaultItem from "./EditableVaultItem";


interface Props {
  id: number;
  handleAddAndGoToDetail?: (id: number) => void;
};

const EditPage: React.FC<Props> = ({ id, handleAddAndGoToDetail }: Props) => {
  const [vaultItemState, setVaultItemState] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();

  const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);
  const fetchVaultItem = useCallback(async () => {
    setLoading(true);
    try {
      const res: AxiosResponse<VaultItem> = await apiInstance.get(`vaults/retrieve-update/${id}/`);
      setVaultItemState(res.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((prev) => (prev ? prev + " Failed to fetch vault item." : "Failed to fetch vault item."));
      console.error("Error fetching vault item:", error);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken, refreshToken, vaultUnlockToken, setAuthTokens]);

  // Fetch the vault item when the component mounts
  useEffect(() => {
    void fetchVaultItem();
  }, [fetchVaultItem]);

  const handleEditVaultItem = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log("Submitting edit for vault item:", vaultItemState);
      
      if (!vaultItemState) return;

      setLoading(true);
      try {
        const res: AxiosResponse<VaultItem> = await apiInstance.patch(`vaults/retrieve-update/${vaultItemState.id}/`, vaultItemState);
        setVaultItemState(res.data);
        setErrorMessage(null);

        if (handleAddAndGoToDetail && res.data.id) handleAddAndGoToDetail(res.data.id);

      } catch (error) {
        setErrorMessage("Failed to edit vault item.");
        console.error("Error editing vault item:", error);

        setTimeout(() => {
          if (handleAddAndGoToDetail && vaultItemState.id) handleAddAndGoToDetail(vaultItemState.id);
          setErrorMessage(null);
        }, 2000);
      } finally {
        setLoading(false);
      }

    },
    [vaultItemState, accessToken, refreshToken, vaultUnlockToken, setAuthTokens]
  );


  if (loading || !vaultItemState || !setVaultItemState) {
    return <div>Loading vault item...</div>;
  }

  return (
    <div>
      <Button
        text="Back to Details"
        handleClick={() => {if (handleAddAndGoToDetail && vaultItemState?.id) handleAddAndGoToDetail(vaultItemState.id)}}
      />
      <EditableVaultItem
        vaultItem={vaultItemState}
        setVaultItem={setVaultItemState}
        onSubmit={handleEditVaultItem}
        isEditing={true}
        loading={loading}
        errorMessage={errorMessage}
      />
    </div>
  );
};



export default EditPage;