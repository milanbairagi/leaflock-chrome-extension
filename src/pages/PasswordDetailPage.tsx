import Button from "../components/buttons/Button";
import { FaArrowLeft } from "react-icons/fa";
import { type VaultItem } from "../types";

interface Props {
  vaultItem: VaultItem;
  goBack?: () => void;
  handleEditClick?: (id: string) => void;
  handleDeleteClick?: (id: string) => void;
}

const PasswordDetailPage: React.FC<Props> = ({
  vaultItem,
  goBack,
  handleEditClick,
  handleDeleteClick,
}) => {
  if (!vaultItem) {
    console.warn(
      "[PasswordDetailPage] No vault item provided yet. Waiting for HomePage to hydrate vault items.",
    );
    return <div>Loading password details...</div>;
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <Button handleClick={goBack} variant="secondary">
          <FaArrowLeft className="inline-block mr-2" />
          Back to Home
        </Button>

        <Button
          handleClick={() => {
            if (handleEditClick) handleEditClick(vaultItem.id);
          }}
          className="mt-2 mb-4"
          variant="secondary"
        >
          Edit
        </Button>
      </div>

      <div className="bg-primary-40 text-primary-0 w-full py-2 px-4 rounded-md mb-6">
        <h2 className="text-xl font-semibold">{vaultItem.title}</h2>
      </div>

      <p className="text-primary-0 font-medium text-lg mb-2">
        Login Credential
      </p>

      <div className="grid mb-7 bg-primary-40 p-4 rounded-md">
        <div className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
          <label htmlFor="username" className="text-md text-secondary-10">
            Username
          </label>
          <p id="username" className="text-lg">
            {vaultItem.username}
          </p>
        </div>
        <div className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
          <label htmlFor="password" className="text-md text-secondary-10">
            Password
          </label>
          <p id="password" className="text-lg">
            {vaultItem.password}
          </p>
        </div>
      </div>

      <p className="text-primary-0 font-medium text-lg mb-2">
        Autofill Options
      </p>
      <div className="bg-primary-40 p-4 rounded-md mb-6">
        <label htmlFor="url1" className="text-md text-secondary-10">
          Website
        </label>
        <p id="url1" className="text-md">
          {vaultItem.url}
        </p>
      </div>

      <p className="text-primary-0 font-medium text-lg mb-2">
        Additional Information
      </p>
      <div className="bg-primary-40 p-4 rounded-md mb-6">
        <label htmlFor="notes" className="text-md text-secondary-10">
          Notes
        </label>
        <p id="notes" className="text-md">
          {vaultItem.notes}
        </p>
      </div>

      {/* Extra Fields */}
      {vaultItem.extra_fields && vaultItem.extra_fields.length > 0 && (
        <div>
          <p className="text-primary-0 font-medium text-lg mb-2">Extra Fields</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            {vaultItem.extra_fields.map((field, index) => (
              <div key={index} className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
                <label htmlFor={`extra_field_${index}`} className="text-md text-secondary-10">
                  {field.title}
                </label>
                <p id={`extra_field_${index}`} className="text-lg">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-primary-0 font-medium text-lg mb-2">Item History</p>
      <div className="bg-primary-40 p-4 rounded-md mb-6">
        <p className="text-md mb-2">
          {new Date(vaultItem.created_at).toLocaleString()}
        </p>
        <p className="text-md">
          {new Date(vaultItem.updated_at).toLocaleString()}
        </p>
      </div>

      <Button
        handleClick={() => {
          if (handleDeleteClick) handleDeleteClick(vaultItem.id);
        }}
        className="mt-2"
        variant="tertiary"
      >
        Delete
      </Button>
    </div>
  );
};

export default PasswordDetailPage;
