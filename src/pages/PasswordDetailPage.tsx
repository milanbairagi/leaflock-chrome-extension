import { type AxiosResponse } from "axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";
import { useEffect, useState } from "react";

interface Props {
  id: number;
  goBack?: () => void;
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

const PasswordDetailPage: React.FC<Props> = ({ id, goBack }) => {
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
          <h2>{passwordDetail.title}</h2>
          <p><strong>Username:</strong> {passwordDetail.username}</p>
          <p><strong>Password:</strong> {passwordDetail.password}</p>
          <p><strong>URL:</strong> {passwordDetail.url}</p>
          <p><strong>Notes:</strong> {passwordDetail.notes}</p>
          <p><strong>Created At:</strong> {new Date(passwordDetail.created_at).toLocaleString()}</p>
          <p><strong>Updated At:</strong> {new Date(passwordDetail.updated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default PasswordDetailPage;
