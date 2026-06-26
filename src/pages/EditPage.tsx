import { useState, useCallback } from "react";
import { type AxiosResponse } from "axios";
import { type VaultItemFull } from "../types";
import api from "../axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import Button from "../components/buttons/Button";
import EditableVaultItem from "./EditableVaultItem";


interface Props {
  vaultItem: VaultItemFull;
  handleAddAndGoToDetail?: (id: number) => void;
};

const EditPage: React.FC<Props> = ({ vaultItem, handleAddAndGoToDetail }: Props) => {
  const [vaultItemState, setVaultItemState] = useState<VaultItemFull | null>(vaultItem);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { accessToken, refreshToken, setAuthTokens } = useAuthCredential();

  const apiInstance = api(accessToken);

  const handleEditVaultItem = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log("Submitting edit for vault item:", vaultItemState);
      
      if (!vaultItemState) return;

      setLoading(true);
      try {
        const res: AxiosResponse<VaultItemFull> = await apiInstance.patch(`vaults/blobs/${vaultItemState.id}/`, vaultItemState);
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
    [vaultItemState, accessToken, refreshToken, setAuthTokens]
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