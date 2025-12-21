import { useState, useEffect } from "react";
import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";


interface props {
  goToLogin: () => void;
  goToVaultUnlock: () => void;
};

interface VaultItem {
  id: number;
  title: string;
  username: string;
  url: string;
  created_at: string;
  updated_at: string;
}

const HomePage: React.FC<props> = ({ goToLogin, goToVaultUnlock }: props) => {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, isLoading, handleLogout } = useUserCredential() ?? { user: null, isLoading: true, handleLogout: async () => {void 0} };
  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();

  if (!vaultUnlockToken) {
    goToVaultUnlock();
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isLoading && !user)  {
    goToLogin();
    return null;
  }

  useEffect(() => {
    fetchPasswordLists();
  }, []);

  const fetchPasswordLists = async () => {
    const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);
    
    try {
      const res: AxiosResponse<VaultItem[]> = await apiInstance.get("vaults/list-create/");
      setVaultItems(res.data);
    } catch (error) {
      setErrorMessage("Failed to fetch password lists.");
      console.error("Error fetching password lists:", error);
    }
  };

  return (
    <div>
      {(user) ? <h3>Welcome! {user.username}</h3> : <h3>Please Login!</h3>}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <div>Password Lists</div>
      <ol>
        {vaultItems.map((item) => (
          <li key={item.id}>{item.title} - {item.username} - {item.url} - Created at: {item.created_at} - Updated at: {item.updated_at}</li>
        ))}
      </ol>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HomePage;
