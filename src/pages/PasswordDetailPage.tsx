import EditButton from "../components/buttons/EditButton";
import { type VaultItem } from "../types";

interface Props {
  vaultItem: VaultItem;
  goBack?: () => void;
  handleEditClick?: (id: number) => void;
};


const PasswordDetailPage: React.FC<Props> = ({ vaultItem, goBack, handleEditClick }) => {
  // const [passwordDetail, setPasswordDetail] = useState<PasswordDetail | null>(null);
  // const [loading, setLoading] = useState<boolean>(true);
  // const [errorMessage, setErrorMessage] = useState<string | null>(null);


  return (
    <div>
      <button onClick={goBack}>Back to Home</button>
      {(vaultItem) && (
        <div>
          <EditButton onClick={() => {
            if (handleEditClick) handleEditClick(vaultItem.id);
          }} />
          <div className="bg-primary-40 text-primary-0 w-full py-2 px-4 rounded-md mb-6">
            <h2 className="text-xl font-semibold">{vaultItem.title}</h2>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Login Credential</p>
          <div className="grid mb-7 bg-primary-40 p-4 rounded-md">
            <div className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
              <label htmlFor="username" className="text-md text-secondary-10">Username</label>
              <p id="username" className="text-lg">{vaultItem.username}</p>
            </div>
            <div className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
              <label htmlFor="password" className="text-md text-secondary-10">Password</label>
              <p id="password" className="text-lg">{vaultItem.password}</p>
            </div>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Autofill Options</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            <label htmlFor="url1" className="text-md text-secondary-10">Website</label>
            <p id="url1" className="text-md">{vaultItem.url}</p>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Additional Information</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            <label htmlFor="notes" className="text-md text-secondary-10">Notes</label>
            <p id="notes" className="text-md">{vaultItem.notes}</p>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Item History</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            <p className="text-md mb-2">{new Date(vaultItem.created_at).toLocaleString()}</p>
            <p className="text-md">{new Date(vaultItem.updated_at).toLocaleString()}</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default PasswordDetailPage;
