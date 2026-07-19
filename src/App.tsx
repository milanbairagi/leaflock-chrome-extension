import { useCallback, useState } from "react";
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
  const [currentPage, setCurrentPage] = useState<Page>(Pages.HOME);

  const goToLogin = useCallback(() => setCurrentPage(Pages.LOGIN), []);
  const goToHome = useCallback(() => setCurrentPage(Pages.HOME), []);
  const goToRegister = useCallback(() => setCurrentPage(Pages.REGISTER), []);

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
