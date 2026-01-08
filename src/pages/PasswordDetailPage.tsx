import { type AxiosResponse } from "axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";
import { useEffect, useState } from "react";
import EditButton from "../components/buttons/EditButton";

interface Props {
  id: number;
  goBack?: () => void;
  handleEditClick?: (id: number) => void;
};

interface PasswordDetail {
  id: number;
  title: string;
  user: number;
  username: string;
  password: string;
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

const PasswordDetailPage: React.FC<Props> = ({ id, goBack, handleEditClick }) => {
  const [passwordDetail, setPasswordDetail] = useState<PasswordDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();

  useEffect(() => {
    let cancelled = false;

    const fetchPasswordDetail = async (passwordId: number) => {
      const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);

      setLoading(true);
      try {
        const res: AxiosResponse<PasswordDetail> = await apiInstance.get(`vaults/retrieve-update/${passwordId}/`);
        setPasswordDetail(res.data);
        setErrorMessage(null);
      } catch (error) {
        console.error("Error fetching password detail:", error);
        setErrorMessage("Failed to fetch password detail.");
        setTimeout(() => goBack && goBack(), 2000);
      } finally {
        setLoading(false);
      }
    };

    if (!cancelled) {
      void fetchPasswordDetail(id);
    }

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, refreshToken, vaultUnlockToken, setAuthTokens]);

  if (loading) {
    return <div>Loading password details...</div>;
  }

  return (
    <div>
      <button onClick={goBack}>Back to Home</button>
      {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
      {(passwordDetail) && (
        <div>
          <EditButton onClick={() => {
            if (handleEditClick) handleEditClick(passwordDetail.id);
          }} />
          <div className="bg-primary-40 text-primary-0 w-full py-2 px-4 rounded-md mb-6">
            <h2 className="text-xl font-semibold">{passwordDetail.title}</h2>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Login Credential</p>
          <div className="grid mb-7 bg-primary-40 p-4 rounded-md">
            <div className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
              <label htmlFor="username" className="text-md text-secondary-10">Username</label>
              <p id="username" className="text-lg">{passwordDetail.username}</p>
            </div>
            <div className="flex flex-col w-full border-b-accent-90 border-b pb-1 mb-3">
              <label htmlFor="password" className="text-md text-secondary-10">Password</label>
              <p id="password" className="text-lg">{passwordDetail.password}</p>
            </div>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Autofill Options</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            <label htmlFor="url1" className="text-md text-secondary-10">Website</label>
            <p id="url1" className="text-md">{passwordDetail.url}</p>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Additional Information</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            <label htmlFor="notes" className="text-md text-secondary-10">Notes</label>
            <p id="notes" className="text-md">{passwordDetail.notes}</p>
          </div>

          <p className="text-primary-0 font-medium text-lg mb-2">Item History</p>
          <div className="bg-primary-40 p-4 rounded-md mb-6">
            <p className="text-md mb-2">{new Date(passwordDetail.created_at).toLocaleString()}</p>
            <p className="text-md">{new Date(passwordDetail.updated_at).toLocaleString()}</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default PasswordDetailPage;
