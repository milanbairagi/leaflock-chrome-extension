import { useCallback, useState } from "react"
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
  const [currentPage, setCurrentPage] = useState<Page>(Pages.LOGIN);

  const goToLogin = useCallback(() => setCurrentPage(Pages.LOGIN), []);
  const goToHome = useCallback(() => setCurrentPage(Pages.HOME), []);
  const goToVaultUnlock = useCallback(() => setCurrentPage(Pages.VAULT_UNLOCK), []);

  return (
    <div className="bg-background text-primary-0 rounded-2xl">
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
