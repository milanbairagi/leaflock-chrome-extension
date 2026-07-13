/*
 * This component is used to edit a vault item.
 * It is used by the AddNewPage and EditPage to render the form for editing a vault item.
 */

import Button from "../components/buttons/Button";
import type { VaultItem, CreateVaultItemPayload } from "../types";
import TextInput from "../components/inputs/TextInput";
import PasswordInput from "../components/inputs/PasswordInput";
import TextareaInput from "../components/inputs/TextareaInput";

type props<T extends VaultItem | CreateVaultItemPayload> = {
  vaultItem: T;
  setVaultItem: React.Dispatch<React.SetStateAction<T>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isEditing?: boolean;
  loading: boolean;
  errorMessage: string | null;
};

const EditableVaultItem = <T extends VaultItem | CreateVaultItemPayload>({
  vaultItem,
  setVaultItem,
  onSubmit,
  isEditing = false,
  loading,
  errorMessage,
}: props<T>) => {

  const buttonText = isEditing
    ? loading
      ? "Saving..."
      : "Save Changes"
    : loading
      ? "Adding..."
      : "Add Item";

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextInput
          label="Title"
          text={vaultItem?.title}
          setText={(value) => setVaultItem((prev) => ({ ...prev, title: value }))}
          name="title"
        />
        
        <TextInput
          label="Username"
          text={vaultItem?.username}
          setText={(value) => setVaultItem((prev) => ({ ...prev, username: value }))}
          name="username"
        />
        
        <PasswordInput
          label="Password"
          password={vaultItem?.password}
          setPassword={(value) => setVaultItem((prev) => ({ ...prev, password: value }))}
          name="password"
        />
        
        <TextInput
          label="URL"
          text={vaultItem?.url}
          setText={(value) => setVaultItem((prev) => ({ ...prev, url: value }))}
          name="url"
        />
        
        <TextareaInput
          label="Notes"
          text={vaultItem?.notes}
          setText={(value) => setVaultItem((prev) => ({ ...prev, notes: value }))}
          name="notes"
        />
        
        <Button variant="primary" type="submit" disabled={loading} className="mt-2">
          {buttonText}
        </Button>
      </form>

      {errorMessage && <div className="text-red-500">{errorMessage}</div>}
    </div>
  );
};

export default EditableVaultItem;
