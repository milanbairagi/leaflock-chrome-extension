/*
 * This component is used to edit a vault item.
 * It is used by the AddNewPage and EditPage to render the form for editing a vault item.
 */

import { useState } from "react";
import Button from "../components/buttons/Button";
import { type VaultItem } from "./AddNewPage";

type props = {
  vaultItem: VaultItem | null;
  setVaultItem: React.Dispatch<React.SetStateAction<VaultItem | null>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isEditing?: boolean;
  loading: boolean;
  errorMessage: string | null;
};

const EditableVaultItem = ({
  vaultItem,
  setVaultItem,
  onSubmit,
  isEditing = false,
  loading,
  errorMessage,
}: props) => {
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setVaultItem((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const buttonText = isEditing
    ? loading
      ? "Saving..."
      : "Save Changes"
    : loading
      ? "Adding..."
      : "Add Item";

  return (
    <div>
      <form onSubmit={onSubmit}>
        title:{" "}
        <input
          type="text"
          value={vaultItem?.title}
          onChange={handleChange}
          name="title"
        />
        <br />
        username:{" "}
        <input
          type="text"
          value={vaultItem?.username}
          onChange={handleChange}
          name="username"
        />
        <br />
        password:{" "}
        <input
          type={passwordVisible ? "text" : "password"}
          value={vaultItem?.password}
          onChange={handleChange}
          name="password"
        />
        <Button
          text={passwordVisible ? "Hide" : "Show"}
          handleClick={togglePasswordVisibility}
        />
        <br />
        url:{" "}
        <input
          type="text"
          value={vaultItem?.url}
          onChange={handleChange}
          name="url"
        />
        <br />
        notes:{" "}
        <textarea
          value={vaultItem?.notes || ""}
          onChange={handleChange}
          name="notes"
        />
        <br />
        <button type="submit" disabled={loading}>
          {buttonText}
        </button>
      </form>

      {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
    </div>
  );
};

export default EditableVaultItem;
