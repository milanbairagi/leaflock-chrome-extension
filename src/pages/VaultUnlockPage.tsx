import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";
import logo from "../assets/images/Logo.svg"


interface props {
  goToLogin: () => void;
  goToHome: () => void;
};

interface DecodedToken {
  user_id: number;
  vault_key: string;
  exp: number;
  iat: number;
};

const VaultUnlockPage: React.FC<props> = ({ goToLogin, goToHome }) => {
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, isLoading } = useUserCredential() ?? { user: null, isLoading: true };
  const { accessToken, refreshToken, setAuthTokens, vaultUnlockToken, unlockVault, lockVault, isHydrated } = useAuthCredential();

  useEffect(() => {
    if (isHydrated && !isLoading && vaultUnlockToken) {
      const decoded: DecodedToken = jwtDecode(vaultUnlockToken);
      const now = new Date();
      if (decoded.exp * 1000 > now.getTime()) {
        unlockVault(vaultUnlockToken);
        goToHome();
      } else {
        lockVault();
      }
    }
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user)  {
    goToLogin();
    return null;
  }

  const fetchVaultUnlockKey = async () => {
    const apiInstance = api(accessToken, refreshToken, null, setAuthTokens);
    
    interface VaultUnlockResponse {
      vault_unlock_token: string;
    };

    try {
      const res: AxiosResponse<VaultUnlockResponse> = await apiInstance.post("vaults/unlock/", {
        master_password: masterPassword,
      });
      unlockVault(res.data.vault_unlock_token);
      setErrorMessage(null);
      goToHome();
    } catch (error) {
      setErrorMessage("Failed to unlock vault. Please check your master password.");
    }
  }

  return (
    <div className="p-5 rounded-md" onSubmit={(e) => {
      e.preventDefault();
      fetchVaultUnlockKey();
    }}>
      
      <div className="flex justify-center items-center flex-col mb-8">
        <img src={logo} alt="Leaflock Logo" className="w-40 mx-auto -mb-2" />
        <p className="text-center">Secure Password Manager</p>
      </div>

      <form className="grid gap-1">
        <label htmlFor="vault-password" className="text-secondary-10">Master Password:</label>
        <input
          type="password"
          id="vault-password"
          value={masterPassword || ""}
          onChange={(e) => setMasterPassword(e.target.value)}
          className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          autoFocus
        />
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        
        <button
          type="submit"
          className="text-center text-white bg-accent-50 rounded-4xl py-2 mt-4 cursor-pointer 
                      hover:bg-accent-70
                      disabled:bg-accent-20 disabled:cursor-not-allowed
                      active:bg-accent-90
                      transition-colors duration-200 ease-in-out
          "
        >
          Submit
        </button>
      </form>

    </div>
  );
};

export default VaultUnlockPage;