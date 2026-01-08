import { useCallback, useState, useLayoutEffect, useEffect } from "react"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import VaultUnlockPage from "./pages/VaultUnlockPage"


const Pages = {
  LOGIN: "login",
  VAULT_UNLOCK: "vault_unlock",
  HOME: "home",
} as const;

type Page = typeof Pages[keyof typeof Pages]


function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const goToLogin = useCallback(() => setCurrentPage(Pages.LOGIN), []);
  const goToHome = useCallback(() => setCurrentPage(Pages.HOME), []);
  const goToVaultUnlock = useCallback(() => setCurrentPage(Pages.VAULT_UNLOCK), []);


  const setPageState = useCallback((page: Page) => {
    chrome.storage.local.set({ "leaflock.currentPage": page})
  }, [currentPage]);

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

      {currentPage === Pages.LOGIN && <LoginPage goToHome={goToHome} />}
      {currentPage === Pages.VAULT_UNLOCK && <VaultUnlockPage goToLogin={goToLogin} goToHome={goToHome} />}
      {currentPage === Pages.HOME && <HomePage  goToLogin={goToLogin} goToVaultUnlock={goToVaultUnlock} />}
    </div>
  )
}

export default App
