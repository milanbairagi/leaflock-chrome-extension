import { useState, useCallback } from "react";
import { useAuthCredential } from "../contexts/useAuthCredential";
import EditableVaultItem from "./EditableVaultItem";
import type { VaultItem } from "../types";
import { sendServiceMessage } from "../hooks/useServiceMessage";

interface props {
  handleAddAndGoToDetail?: (newItemId: string) => void;
}
const AddNewPage = ({ handleAddAndGoToDetail }: props) => {
  const [vaultItem, setVaultItem] = useState<VaultItem>({
    id: "",
    title: "",
    username: "",
    password: "",
    url: "",
    extra_fields: [],
    notes: "",
    is_deleted: false,
    created_at: "",
    updated_at: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { hasUnlockKey } = useAuthCredential();

  const addNewVaultItem = useCallback(async (updatedVaultItem: VaultItem) => {
    if (!hasUnlockKey) {
      setErrorMessage("Missing authentication or vault unlock key.");
      return;
    }

    setVaultItem(updatedVaultItem);

    setLoading(true);
    try {
      if (!hasUnlockKey) {
        throw new Error("Vault unlock key is missing.");
      }
      
      const swResponse= await sendServiceMessage({
          type: "ADD_NEW_VAULT_ITEM",
          payload: { 
            vaultItem: updatedVaultItem,
        },
      });
      
      if (!swResponse.success) {
        throw new Error(swResponse.error || "Failed to add new vault item.");
      }
      const newItemId = (swResponse.data as { newItemId?: string } | undefined)?.newItemId;
      setErrorMessage(null);

      if (handleAddAndGoToDetail && newItemId) {
        handleAddAndGoToDetail(newItemId);
      }

    } catch (error) {
      setErrorMessage("Failed to add new vault item.");
      console.warn("Error adding new vault item:", error);
    } finally {
      setLoading(false);
    }
  }, [hasUnlockKey]);

  return (
    <div>
      <EditableVaultItem
        vaultItem={vaultItem}
        onSubmit={addNewVaultItem}
        isEditing={false}
        loading={loading}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default AddNewPage;
