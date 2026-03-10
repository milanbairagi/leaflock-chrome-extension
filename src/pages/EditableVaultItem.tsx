/*
 * This component is used to edit a vault item.
 * It is used by the AddNewPage and EditPage to render the form for editing a vault item.
 */

import { useState } from "react";
import { type VaultItem } from "../types";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Button from "../components/buttons/Button";

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

        
        <div className="bg-primary-40 text-primary-0 w-full py-2 px-4 rounded-md mb-6">
          <p className="text-primary-0 font-medium text-lg mb-2">Title</p>
          <input
            type="text"
            value={vaultItem?.title}
            onChange={handleChange}
            name="title"
            className="text-xl font-semibold"
          />
        </div>

        <p className="text-primary-0 font-medium text-lg mb-2">Login Credential</p>
        <div className="grid mb-7 bg-primary-40 p-4 rounded-md min-w-0">
          <div className="flex flex-col border-b-accent-90 border-b pb-1 mb-3 min-w-0">
            <label htmlFor="username" className="text-md text-secondary-10">Username</label>
            <input
              type="text"
              value={vaultItem?.username}
              onChange={handleChange}
              name="username"
              className="text-lg block w-full min-w-0"
            />
          </div>
          <div className="flex flex-col border-b-accent-90 border-b pb-1 mb-3 min-w-0">
            <label htmlFor="password" className="text-md text-secondary-10">Password</label>
            <div className="flex items-center">
              <input
                type={passwordVisible ? "text" : "password"}
                value={vaultItem?.password}
                onChange={handleChange}
                name="password"
                className="text-lg block w-full min-w-0 grow"
              />

              <div
                className="flex items-center cursor-pointer pl-2"
                onClick={togglePasswordVisibility}
              >
                {passwordVisible ? (
                  <FaEye className="h-4 w-4 text-primary-0" />
                ) : (
                  <FaEyeSlash className="h-4 w-4 text-primary-0" />
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-primary-0 font-medium text-lg mb-2">Autofill Options</p>
        <div className="bg-primary-40 p-4 rounded-md mb-6">
          <label htmlFor="url1" className="text-md text-secondary-10 block">Website</label>
          <input
            type="text"
            value={vaultItem?.url}
            onChange={handleChange}
            name="url"
            className="text-md block w-full"
          />
        </div>

        <p className="text-primary-0 font-medium text-lg mb-2">Additional Information</p>
        <div className="bg-primary-40 p-4 rounded-md mb-6">
          <label htmlFor="notes" className="text-md text-secondary-10 block">Notes</label>
          <textarea
            value={vaultItem?.notes || ""}
            onChange={handleChange}
            name="notes"
            className="text-md block w-full"
          />
        </div>

        {errorMessage && <div className="text-red-500 my-2">{errorMessage}</div>}
        <Button text={buttonText} type="submit" isDisable={loading} />
      </form>

    </div>
  );
};


export default EditableVaultItem;
