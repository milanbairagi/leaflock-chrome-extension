import { useCallback, useEffect, useState } from "react";
import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";
import PasswordDetailPage from "./PasswordDetailPage";
import AddNewPage from "./AddNewPage";
import EditPage from "./EditPage";
import { sendServiceMessage } from "../hooks/useServiceMessage";

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
  const [pageState, setPageState] = useState<"list" | "detail" | "add" | "edit">("list");
  const [selectedPasswordId, setSelectedPasswordId] = useState<number | null>(null);
  const { user, isLoading, handleLogout } = useUserCredential() ?? { user: null, isLoading: true, handleLogout: async () => {void 0} };
  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();

  const needsVaultUnlock = !vaultUnlockToken;
  const needsLogin = !isLoading && !user;

  useEffect(() => {
    if (needsVaultUnlock) goToVaultUnlock();
  }, [needsVaultUnlock, goToVaultUnlock]);

  useEffect(() => {
    if (needsLogin) goToLogin();
  }, [needsLogin, goToLogin]);

  const fetchPasswordLists = useCallback(async () => {
    if (!vaultUnlockToken) return;
    const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);

    try {
      const res: AxiosResponse<VaultItem[]> = await apiInstance.get("vaults/list-create/");
      setVaultItems(res.data);
    } catch (error) {
      setErrorMessage("Failed to fetch password lists.");
      console.error("Error fetching password lists:", error);
    }
  }, [accessToken, refreshToken, setAuthTokens, vaultUnlockToken]);

  useEffect(() => {
    if (needsVaultUnlock) return;
    if (isLoading) return;
    if (!user) return;
    const timeoutId = globalThis.setTimeout(() => {
      void fetchPasswordLists();
    }, 0);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [fetchPasswordLists, isLoading, needsVaultUnlock, user]);

  useEffect(() => {
    if (vaultItems.length === 0) return;
    sendServiceMessage({
      type: "STORE_VAULT_ITEMS",
      payload: {
        items: vaultItems,
      },
    });
  }, [vaultItems]);

  if (needsVaultUnlock) return null;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (needsLogin) return null;

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

  const handleEditClick = (id: number) => {
    setPageState("edit");
    setSelectedPasswordId(id);
  }

  return (
    <div className="p-5 rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">LockLeaf</h2>
        <button onClick={() => setPageState("add")} className="bg-accent-50 text-white text-sm px-3 py-2 rounded-2xl hover:bg-accent-70 active:bg-accent-90">Add New</button>
      </div>
      
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {pageState === "add" &&
        <>
          <button onClick={handleBackToList}>Back to List</button>
          <AddNewPage handleAddAndGoToDetail={handleAddAndGoToDetail} />
        </>
      }

      {pageState === "list" &&
        <>
          {/* {(user) &&
            <h3 className="text-primary-0 text-2xl">Welcome! {user.username}</h3>
          } */}
          <ListView vaultItems={vaultItems} handleClick={handleShowDetail} 
            // handleEditClick={handleEditClick}
          />
        </>
      }
      {pageState === "detail" && selectedPasswordId !== null &&
        <PasswordDetailPage 
          id={selectedPasswordId} 
          goBack={handleBackToList}
          handleEditClick={handleEditClick}
        />
      }
      {pageState === "edit" && selectedPasswordId !== null && 
        <EditPage 
          id={selectedPasswordId} 
          handleAddAndGoToDetail={handleAddAndGoToDetail} 
        />
      }
      
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

const ListView: React.FC<{
  vaultItems: VaultItem[],
  handleClick: (id: number) => void
}> = ({ vaultItems, handleClick }) => {
  return (
    <ol className="grid gap-2">
      {vaultItems.map((item) => (
        <li
          key={item.id} onClick={() => handleClick(item.id)}
          className="flex gap-2 w-full bg-primary-40 text-primary-0 rounded-2xl py-2 px-4 cursor-pointer
                hover:bg-accent-80 hover:text-white active:bg-accent-90
                transition-colors duration-200 ease-in-out
          "
        >
          <div className="grid items-center">
            <span className="text-sm text-secondary-10">P{item.id}</span>
          </div>
          <div className="grow">
            <h4 className="text-md font-bold text-white">{item.title}</h4>
            <p className="text-sm mb-0">{item.url}</p>
            <p className="text-xs mb-0">{item.username}</p>
          </div>

          {/* <EditButton
            onClick={() => {
              if (handleEditClick) handleEditClick(item.id);
            }}
          /> */}

        </li>
      ))}
    </ol>
  )
};

export default HomePage;
