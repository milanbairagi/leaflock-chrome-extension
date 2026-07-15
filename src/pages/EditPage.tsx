import { useState, useCallback } from "react";
// import { type AxiosResponse } from "axios";
import { type VaultItem } from "../types";
// import api from "../axios";
import { sendServiceMessage } from "../hooks/useServiceMessage";
import { FaArrowLeft } from "react-icons/fa";
import Button from "../components/buttons/Button";
import EditableVaultItem from "./EditableVaultItem";


interface Props {
  vaultItem: VaultItem;
  handleAddAndGoToDetail?: (id: string) => void;
};

const EditPage: React.FC<Props> = ({ vaultItem, handleAddAndGoToDetail }: Props) => {
  const [vaultItemState, setVaultItemState] = useState<VaultItem>(vaultItem);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // const apiInstance = api(accessToken);

  const handleEditVaultItem = useCallback(
    async (updatedVaultItem: VaultItem) => {
      if (!updatedVaultItem) return;

      setVaultItemState(updatedVaultItem);

      setLoading(true);
      try {
        // const res: AxiosResponse<VaultItem> = await apiInstance.patch(`vaults/blobs/${updatedVaultItem.id}/`, updatedVaultItem);
        // setVaultItemState(res.data);
        console.log("[EditPage] Editing vault item:", updatedVaultItem);
        setErrorMessage(null);
        await sendServiceMessage({
          type: "UPDATE_VAULT_ITEM",
          payload: {
            item: updatedVaultItem,
          },
        });

        if (handleAddAndGoToDetail) handleAddAndGoToDetail(updatedVaultItem.id);

      } catch (error) {
        setErrorMessage("Failed to edit vault item.");
        console.warn("Error editing vault item:", error);

        // setTimeout(() => {
        //   if (handleAddAndGoToDetail && vaultItemState.id) handleAddAndGoToDetail(vaultItemState.id);
        //   setErrorMessage(null);
        // }, 2000);
      } finally {
        setLoading(false);
      }

    },
    [handleAddAndGoToDetail]
  );


  if (loading || !vaultItemState || !setVaultItemState) {
    return <div>Loading vault item...</div>;
  }

  return (
    <div>
      <Button
        handleClick={() => {if (handleAddAndGoToDetail && vaultItemState?.id) handleAddAndGoToDetail(vaultItemState.id)}}
        className="mt-2 mb-4"
        variant="secondary"
      >
        <FaArrowLeft className="inline-block mr-2" />
        Back to Details
      </Button>
      
      <EditableVaultItem
        vaultItem={vaultItemState}
        onSubmit={handleEditVaultItem}
        isEditing={true}
        loading={loading}
        errorMessage={errorMessage}
      />
    </div>
  );
};



export default EditPage;