import { useEffect, useState } from "react";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import { FaArrowLeft } from "react-icons/fa";
import PasswordDetailPage from "./PasswordDetailPage";
import AddNewPage from "./AddNewPage";
import EditPage from "./EditPage";
import Button from "../components/buttons/Button";
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
  const [selectedPasswordId, setSelectedPasswordId] = useState<string | null>(
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


  useEffect(() => {
    if (!isHydrated || isLoading || needsLogin) return;
    if (!pageState) return;

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
    
  }, [isHydrated, isLoading, needsLogin, pageState]);

  const deleteVaultIItem = async (id: string) => {
    const response = await sendServiceMessage({
      type: "DELETE_VAULT_ITEM",
      payload: { id },
    });
    if (!response.success) {
      console.warn("[HomePage] Failed to delete vault item:", response.error);
      setErrorMessage("Failed to delete vault item.");
      return;
    }
  };

  const handleBackToList = () => {
    setPageState("list");
    setSelectedPasswordId(null);
  };

  const handleShowDetail = (id: string) => {
    setSelectedPasswordId(id);
    setPageState("detail");
  };

  const handleAddAndGoToDetail = (id: string) => {
    // Refresh the list then go to detail view
    // fetchVaultItems();
    setSelectedPasswordId(id);
    setPageState("detail");
  };

  const handleEditClick = (id: string) => {
    setPageState("edit");
    setSelectedPasswordId(id);
  };

  if (!isHydrated || isLoading) {
    return <div>Loading...</div>;
  }
  if (needsLogin) return null;

  return (
    <div className="p-5 rounded-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">
          {pageState === "list" ? "LeafLock" : 
          pageState === "detail" ? "Password Details" :
          pageState === "add" ? "Add New Password" : "Edit Password"}
        </h2>
        {pageState === "list" && 
          <Button
            handleClick={() => setPageState("add")}
          >
            Add New
          </Button>
        }
      </div>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {pageState === "add" && (
        <>
          <Button onClick={handleBackToList}>
            <FaArrowLeft className="inline-block mr-2" />
            Back to List
          </Button>
          <AddNewPage handleAddAndGoToDetail={handleAddAndGoToDetail} />
        </>
      )}

      {pageState === "list" && (
        <ListView
          vaultItems={vaultItems.filter((item) => !item.is_deleted)}
          handleClick={handleShowDetail}
        />
      )}
      {pageState === "detail" && selectedPasswordId !== null && (
        <PasswordDetailPage
          vaultItem={vaultItems.find((item) => item.id === selectedPasswordId)!}
          goBack={handleBackToList}
          handleEditClick={handleEditClick}
          handleDeleteClick={deleteVaultIItem}
        />
      )}
      {pageState === "edit" && selectedPasswordId !== null && (
        <EditPage
          vaultItem={vaultItems.find((item) => item.id === selectedPasswordId)!}
          handleAddAndGoToDetail={handleAddAndGoToDetail}
        />
      )}

      <Button handleClick={handleLogout} variant="secondary" className="mt-4">
        Logout
      </Button>
    </div>
  );
};

const ListView: React.FC<{
  vaultItems: VaultItem[];
  handleClick: (id: string) => void;
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
            <span className="text-sm text-secondary-10">
              {item.url ? new URL(item.url).hostname[0].toUpperCase() : "P"}
            </span>
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
