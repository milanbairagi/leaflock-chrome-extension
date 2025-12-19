import { useState } from "react"
import HomePage from "./pages/home-page"
import LoginPage from "./pages/login-page"
import VaultUnlockPage from "./pages/vault-unlock-page"


const Pages = {
  LOGIN: "login",
  VAULT_UNLOCK: "vault_unlock",
  HOME: "home",
} as const;

type Page = typeof Pages[keyof typeof Pages]


function App() {
  const [currentPage, setCurrentPage] = useState<Page>(Pages.LOGIN)

  return (
    <>
      <h1>Leaflock Chrome Extension</h1>

      <nav>
        <button type="button" onClick={() => setCurrentPage(Pages.LOGIN)}>
          Login
        </button>
        <button type="button" onClick={() => setCurrentPage(Pages.VAULT_UNLOCK)}>
          Unlock Vault
        </button>
        <button type="button" onClick={() => setCurrentPage(Pages.HOME)}>
          Home
        </button>
      </nav>

      {currentPage === Pages.LOGIN && <LoginPage />}
      {currentPage === Pages.VAULT_UNLOCK && <VaultUnlockPage />}
      {currentPage === Pages.HOME && <HomePage />}
    </>
  )
}

export default App
