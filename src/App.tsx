import { useCallback, useState, useLayoutEffect, useEffect } from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import VaultUnlockPage from "./pages/VaultUnlockPage";
import RegisterPage from "./pages/RegisterPage";

const Pages = {
  LOGIN: "login",
  REGISTER: "register",
  VAULT_UNLOCK: "vault_unlock",
  HOME: "home",
} as const;

type Page = (typeof Pages)[keyof typeof Pages];

function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const goToLogin = useCallback(() => setCurrentPage(Pages.LOGIN), []);
  const goToHome = useCallback(() => setCurrentPage(Pages.HOME), []);
  const goToVaultUnlock = useCallback(
    () => setCurrentPage(Pages.VAULT_UNLOCK),
    [],
  );
  const goToRegister = useCallback(() => setCurrentPage(Pages.REGISTER), []);

  const setPageState = useCallback(
    (page: Page) => {
      chrome.storage.local.set({ "leaflock.currentPage": page });
    },
    [currentPage],
  );

  const getPageState = useCallback(async (): Promise<Page | null> => {
    const result = await chrome.storage.local.get("leaflock.currentPage");
    if (result["leaflock.currentPage"]) {
      return result["leaflock.currentPage"] as Page;
    }
    return null;
  }, []);

  // On app load, retrieve saved page state
  useLayoutEffect(() => {
    (async () => {
      const savedPage = await getPageState();
      setCurrentPage(savedPage || Pages.LOGIN);
      setIsLoading(false);
    })();
  }, []);

  // Whenever currentPage changes, save to storage
  useEffect(() => {
    if (currentPage !== null) {
      setPageState(currentPage);
    }
  }, [currentPage]);

  if (isLoading || currentPage === null) {
    return <div>Loading...</div>;
  }

  const sendMessageToContent = async (message: {
    type: string;
    payload?: unknown;
  }) => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) return null;

    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response;
  };

  // test content script communication
  async function getInputFieldsFromCurrentTab() {
    try {
      const response = await sendMessageToContent({
        type: "FIND_INPUT_FIELDS",
      });
      return response;
    } catch (error) {
      console.error("Error fetching input fields from content script:", error);
    }
    return null;
  }

  // test auto fill
  async function autoFields() {
    try {
      const response = await sendMessageToContent({
        type: "SET_INPUT_FIELD_VALUES",
        payload: {
          values: {
            username: "testuser",
            password: "testpassword",
            email: "test@example.com",
          },
        },
      });
      console.log("Auto fill response:", response);
    } catch (error) {
      console.error("Error setting input field values:", error);
    }
  }

  return (
    <div className="bg-background text-primary-0 h-full w-full overflow-y-scroll">
      {/* <nav>
        <button type="button" onClick={() => setCurrentPage(Pages.LOGIN)}>
          Login
        </button>
        <button type="button" onClick={() => setCurrentPage(Pages.VAULT_UNLOCK)}>
          Unlock Vault
        </button>
        <button type="button" onClick={() => setCurrentPage(Pages.HOME)}>
          Home
        </button>
      </nav> */}
      <button
        onClick={getInputFieldsFromCurrentTab}
        className="bg-red-500 px-4 py-2"
      >
        Fetch Input
      </button>
      <button
        onClick={autoFields}
        className="bg-red-500 px-4 py-2"
      >
        Test Auto Fill
      </button>
      0
      {currentPage === Pages.LOGIN && (
        <LoginPage goToHome={goToHome} goToRegister={goToRegister} />
      )}
      {currentPage === Pages.REGISTER && (
        <RegisterPage goToHome={goToHome} goToLogin={goToLogin} />
      )}
      {currentPage === Pages.VAULT_UNLOCK && (
        <VaultUnlockPage goToLogin={goToLogin} goToHome={goToHome} />
      )}
      {currentPage === Pages.HOME && (
        <HomePage goToLogin={goToLogin} goToVaultUnlock={goToVaultUnlock} />
      )}
    </div>
  );
}

export default App;
