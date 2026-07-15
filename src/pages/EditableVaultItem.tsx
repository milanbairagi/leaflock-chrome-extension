/*
 * This component is used to edit a vault item.
 * It is used by the AddNewPage and EditPage to render the form for editing a vault item.
 */

import { useState } from "react";
import Button from "../components/buttons/Button";
import type { VaultItem, CreateVaultItemPayload } from "../types";
import TextInput from "../components/inputs/TextInput";
import PasswordInput from "../components/inputs/PasswordInput";
import TextareaInput from "../components/inputs/TextareaInput";

type props<T extends VaultItem | CreateVaultItemPayload> = {
  vaultItem: T;
  onSubmit: (vaultItem: T) => void | Promise<void>;
  isEditing?: boolean;
  loading: boolean;
  errorMessage: string | null;
};

const EditableVaultItem = <T extends VaultItem | CreateVaultItemPayload>({
  vaultItem,
  onSubmit,
  isEditing = false,
  loading,
  errorMessage,
}: props<T>) => {
  const [editableVaultItem, setEditableVaultItem] = useState<T>(structuredClone(vaultItem));
  const [showExtraFieldDialog, setShowExtraFieldDialog] = useState(false);

  const buttonText = isEditing
    ? loading
      ? "Saving..."
      : "Save Changes"
    : loading
      ? "Adding..."
      : "Add Item";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextVaultItem = structuredClone(editableVaultItem);
    onSubmit(nextVaultItem);
  };

  const addExtraField = (fieldName: string) => {
    if (!fieldName) return;

    setEditableVaultItem((prev) => ({
      ...prev,
      extra_fields: [...(prev.extra_fields || []), { title: fieldName, value: "" }],
    }));
  }
  
  const removeExtraField = (index: number) => {
    setEditableVaultItem((prev) => ({
      ...prev,
      extra_fields: prev.extra_fields?.filter((_, i) => i !== index),
    }));
  };
  
  const updateExtraField = (index: number, value: string) => {
    setEditableVaultItem((prev) => ({
      ...prev,
      extra_fields: prev.extra_fields?.map((field, i) => i === index ? { ...field, value } : field),
    }));
  };

  const handleAddExtraFieldClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowExtraFieldDialog(true);
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInput
          label="Title"
          text={editableVaultItem?.title}
          setText={(value) => setEditableVaultItem((prev) => ({ ...prev, title: value }))}
          name="title"
        />
        
        <TextInput
          label="Username"
          text={editableVaultItem?.username}
          setText={(value) => setEditableVaultItem((prev) => ({ ...prev, username: value }))}
          name="username"
        />
        
        <PasswordInput
          label="Password"
          password={editableVaultItem?.password}
          setPassword={(value) => setEditableVaultItem((prev) => ({ ...prev, password: value }))}
          name="password"
        />
        
        <TextInput
          label="URL"
          text={editableVaultItem?.url}
          setText={(value) => setEditableVaultItem((prev) => ({ ...prev, url: value }))}
          name="url"
        />
        
        <TextareaInput
          label="Notes"
          text={editableVaultItem?.notes}
          setText={(value) => setEditableVaultItem((prev) => ({ ...prev, notes: value }))}
          name="notes"
        />

        {editableVaultItem.extra_fields?.map((field, index) => (
          <div key={index} className="flex items-center gap-2">
            <TextInput
              label={field.title}
              text={field.value}
              setText={(value) => updateExtraField(index, value)}
              name={`extra_field_${index}`}
            />
            <Button
              variant="secondary"
              type="button"
              onClick={() => removeExtraField(index)}
              className="ml-2"
            >
              Remove
            </Button>
          </div>
        ))}
        
        <Button variant="secondary" type="button" onClick={handleAddExtraFieldClick}>
          Add Extra Field
        </Button>

        {showExtraFieldDialog && (
          <AddExtraFieldDialog onAdd={addExtraField} setShowDialog={setShowExtraFieldDialog} />
        )}
        
        <Button variant="primary" type="submit" disabled={loading} className="mt-2">
          {buttonText}
        </Button>
      </form>

      {errorMessage && <div className="text-red-500">{errorMessage}</div>}
    </div>
  );
};

const AddExtraFieldDialog = ({ onAdd, setShowDialog }: {
  onAdd: (fieldName: string) => void;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [fieldName, setFieldName] = useState("");

  const handleAdd = () => {
    onAdd(fieldName);
    setFieldName("");
    setShowDialog(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-2 bg-primary-50 border border-accent-50 rounded-2xl p-4">
      <h3 className="text-lg font-semibold mb-2">Add Extra Field</h3>
      <TextInput
        label="Field Name"
        text={fieldName}
        setText={setFieldName}
        name="extra_field_name"
        autofocus={true}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" type="button" onClick={() => { setFieldName(""); setShowDialog(false); }}>
          Cancel
        </Button>
        <Button variant="primary" type="button" onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}

export default EditableVaultItem;
