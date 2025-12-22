import React, { useState, useEffect } from "react";
import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";
import PasswordDetailPage from "./PasswordDetailPage";
import AddNewPage from "./AddNewPage";


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
  const [pageState, setPageState] = useState<"list" | "detail" | "add">("list");
  const [selectedPasswordId, setSelectedPasswordId] = useState<number | null>(null);
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

  const handleBackToList = () => {
    setPageState("list");
    setSelectedPasswordId(null);
  };

  const handleShowDetail = (id: number) => {
    setSelectedPasswordId(id);
    setPageState("detail");
  };

  const handleAddAndGoToDetail = (id: number) => {
    // Refresh the list then go to detail view
    fetchPasswordLists();
    setSelectedPasswordId(id);
    setPageState("detail");
  };

  return (
    <div>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {pageState === "add" &&
        <>
          <button onClick={handleBackToList}>Back to List</button>
          <AddNewPage handleAddAndGoToDetail={handleAddAndGoToDetail} />
        </>
      }

      {pageState === "list" &&
        <>
          {(user) && <h3>Welcome! {user.username}</h3>}
          <button onClick={() => setPageState("add")}>Add New</button>
          <ListView vaultItems={vaultItems} handleClick={handleShowDetail} />
        </>
      }
      {pageState === "detail" && selectedPasswordId !== null &&
        <PasswordDetailPage 
          id={selectedPasswordId} 
          goBack={handleBackToList} 
        />
      }
      
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

const ListView: React.FC<{ vaultItems: VaultItem[], handleClick: (id: number) => void }> = ({ vaultItems, handleClick }) => {
  return (
    <div>
      <div>Password Lists</div>
      <ol>
        {vaultItems.map((item) => (
          <li key={item.id} onClick={() => handleClick(item.id)}
              style={{ cursor: "pointer", backgroundColor: "#f0f0f0" }}
          >
            {item.title} - {item.username} - {item.url}
          </li>
        ))}
      </ol>
    </div>
  )
};

export default HomePage;
