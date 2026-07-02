import { useEffect, useState } from "react";
// import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
// import api from "../axios";
import PasswordDetailPage from "./PasswordDetailPage";
import AddNewPage from "./AddNewPage";
import EditPage from "./EditPage";
import { sendServiceMessage } from "../hooks/useServiceMessage";
import { type VaultItem } from "../types";

interface props {
  goToLogin: () => void;
}

// const vaultFetchInFlight = new Map<string, Promise<void>>();


const HomePage: React.FC<props> = ({ goToLogin }: props) => {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
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
  const { isHydrated, hasUnlockKey } = useAuthCredential();

  const needsLogin = (!isLoading && !user) || !hasUnlockKey;

  useEffect(() => {
    if (needsLogin) goToLogin();
  }, [needsLogin, goToLogin]);

  /*
  const fetchVaultItemsOnline = useCallback(async () => {
    if (!accessToken) return;

    const inFlightRequest = vaultFetchInFlight.get(accessToken);
    if (inFlightRequest) {
      await inFlightRequest;
      return;
    }

    const apiInstance = api(accessToken);
    console.log("[HomePage] Fetching vault items with access token:", accessToken);

    const request = (async () => {
      try {
        const res: AxiosResponse<VaultItem[]> = await apiInstance.get(
          "vaults/blobs/",
        );
        console.log("[HomePage] Fetched vault items:", res.data);
        const vaults = res.data;

        const storeRes = await sendServiceMessage({
          type: "STORE_VAULT_ITEMS",
          payload: {
            items: vaults,
          }
        });

        if (!storeRes.success) {
          console.error("[HomePage] Failed to store vault items in background:", storeRes.error);
          setErrorMessage("Failed to store vault items in background.");
          return;
        }

        const decryptedVaults = await sendServiceMessage({
          type: "GET_DECRYPTED_VAULT_ITEMS",
        });
      
        if (!decryptedVaults.success) {
          console.error("[HomePage] Failed to decrypt vault items:", decryptedVaults.error);
          setErrorMessage("Failed to decrypt vault items.");
          return;
        }

        console.log("[HomePage] Decrypted vault items:", decryptedVaults.vaults);
        setVaultItems(decryptedVaults.vaults as VaultItem[]);

      } catch (error) {
        console.error("[HomePage] Error fetching vault items:", error);
        setErrorMessage("Failed to fetch vault items.");
      }
    })();

    vaultFetchInFlight.set(accessToken, request);

    try {
      await request;
    } finally {
      if (vaultFetchInFlight.get(accessToken) === request) {
        vaultFetchInFlight.delete(accessToken);
      }
    }
  }, [accessToken, refreshToken, setAuthTokens, hasUnlockKey]);
  */


  useEffect(() => {
    if (!isHydrated || isLoading || needsLogin) return;

    (async () => {
      const response = await sendServiceMessage({
        type: "GET_DECRYPTED_VAULT_ITEMS",
      });

      if (!response.success) {
        console.error("[HomePage] Failed to get decrypted vault items:", response.error);
        setErrorMessage("Failed to get decrypted vault items.");
        return;
      }

      console.log("[HomePage] Decrypted vault items:", response.vaults);
      setVaultItems(response.vaults as VaultItem[]);
    })();
    
  }, [isHydrated, isLoading, needsLogin]);

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
    // fetchVaultItems();
    setSelectedPasswordId(id);
    setPageState("detail");
  };

  const handleEditClick = (id: number) => {
    setPageState("edit");
    setSelectedPasswordId(id);
  };

  if (!isHydrated || isLoading) {
    return <div>Loading...</div>;
  }
  if (needsLogin) return null;

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
  vaultItems: VaultItem[];
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
