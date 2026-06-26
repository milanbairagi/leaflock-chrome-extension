import { useCallback, useEffect, useState } from "react";
import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";
import PasswordDetailPage from "./PasswordDetailPage";
import AddNewPage from "./AddNewPage";
import EditPage from "./EditPage";
import { sendServiceMessage } from "../hooks/useServiceMessage";
import { type VaultItemFull } from "../types";

interface props {
  goToLogin: () => void;
}


const HomePage: React.FC<props> = ({ goToLogin }: props) => {
  const [vaultItems, setVaultItems] = useState<VaultItemFull[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageState, setPageState] = useState<
    "list" | "detail" | "add" | "edit"
  >("list");
  const [selectedPasswordId, setSelectedPasswordId] = useState<number | null>(
    null,
  );
  const { user, isLoading, handleLogout } = useUserCredential() ?? {
    user: null,
    isLoading: true,
    handleLogout: null,
  };
  const { accessToken, refreshToken, vaultUnlockKey, setAuthTokens } = useAuthCredential();

  const needsVaultUnlock = !vaultUnlockKey;
  const needsLogin = (!isLoading && !user) || !accessToken || !refreshToken;

  useEffect(() => {
    if (needsVaultUnlock) goToLogin();
  }, [needsVaultUnlock]);

  useEffect(() => {
    if (needsLogin) goToLogin();
  }, [needsLogin, goToLogin]);

  useEffect(() => {
    fetchPasswordLists();
  }, []);

  useEffect(() => {
    if (vaultItems.length === 0) return;
    sendServiceMessage({
      type: "STORE_VAULT_ITEMS",
      payload: {
        items: vaultItems,
      },
    });
  }, [vaultItems]);

  const fetchPasswordLists = useCallback(async () => {
    if (!vaultUnlockKey) return;
    const apiInstance = api(accessToken);

    try {
      const res: AxiosResponse<VaultItemFull[]> = await apiInstance.get(
        "vaults/blobs/",
      );
      setVaultItems(res.data);
    } catch (error) {
      setErrorMessage("Failed to fetch password lists.");
    }
  }, [accessToken, refreshToken, setAuthTokens, vaultUnlockKey]);

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
  };

  if (needsLogin || needsVaultUnlock) return null;
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-5 rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">LockLeaf</h2>
        <button
          onClick={() => setPageState("add")}
          className="bg-accent-50 text-white text-sm px-3 py-2 rounded-2xl hover:bg-accent-70 active:bg-accent-90"
        >
          Add New
        </button>
      </div>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      <h1>{pageState}</h1>

      {pageState === "add" && (
        <>
          <button onClick={handleBackToList}>Back to List</button>
          <AddNewPage handleAddAndGoToDetail={handleAddAndGoToDetail} />
        </>
      )}

      {pageState === "list" && (
        <>
          {/* {(user) &&
            <h3 className="text-primary-0 text-2xl">Welcome! {user.username}</h3>
          } */}
          <ListView
            vaultItems={vaultItems}
            handleClick={handleShowDetail}
            // handleEditClick={handleEditClick}
          />
        </>
      )}
      {pageState === "detail" && selectedPasswordId !== null && (
        <PasswordDetailPage
          vaultItem={vaultItems.find((item) => item.id === selectedPasswordId)!}
          goBack={handleBackToList}
          handleEditClick={handleEditClick}
        />
      )}
      {pageState === "edit" && selectedPasswordId !== null && (
        <EditPage
          vaultItem={vaultItems.find((item) => item.id === selectedPasswordId)!}
          handleAddAndGoToDetail={handleAddAndGoToDetail}
        />
      )}

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

const ListView: React.FC<{
  vaultItems: VaultItemFull[];
  handleClick: (id: number) => void;
}> = ({ vaultItems, handleClick }) => {
  return (
    <ol className="grid gap-2">
      {vaultItems.map((item) => (
        <li
          key={item.id}
          onClick={() => handleClick(item.id)}
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
  );
};

export default HomePage;
