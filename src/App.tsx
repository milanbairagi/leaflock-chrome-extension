import { useCallback, useState, useLayoutEffect, useEffect } from "react";
import { storageGet, storageSet } from "./utils/storage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const Pages = {
  LOGIN: "login",
  REGISTER: "register",
  HOME: "home",
} as const;

type Page = (typeof Pages)[keyof typeof Pages];

function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const goToLogin = useCallback(() => setCurrentPage(Pages.LOGIN), []);
  const goToHome = useCallback(() => setCurrentPage(Pages.HOME), []);
  const goToRegister = useCallback(() => setCurrentPage(Pages.REGISTER), []);

  const setPageState = useCallback(
    async (page: Page) => {
      await storageSet("leaflock.currentPage", page);
    },
    [currentPage],
  );

  const getPageState = useCallback(async (): Promise<Page | null> => {
    const result = await storageGet("leaflock.currentPage");
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
      
      {currentPage === Pages.LOGIN && (
        <LoginPage goToHome={goToHome} goToRegister={goToRegister} />
      )}
      {currentPage === Pages.REGISTER && (
        <RegisterPage goToHome={goToHome} goToLogin={goToLogin} />
      )}
      {currentPage === Pages.HOME && (
        <HomePage goToLogin={goToLogin} />
      )}
    </div>
  );
}

export default App;
