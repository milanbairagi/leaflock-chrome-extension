import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { type AxiosResponse } from "axios";
import { useUserCredential } from "../contexts/useUser";
import { useAuthCredential } from "../contexts/useAuthCredential";
import api from "../axios";


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
    <div>
      <h2>Vault Unlock</h2>
      <label htmlFor="vault-password">Master Password:</label>
      <input
        type="password"
        id="vault-password"
        value={masterPassword || ""}
        onChange={(e) => setMasterPassword(e.target.value)}
      />
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <button onClick={fetchVaultUnlockKey} >Unlock</button>
    </div>
  );
};

export default VaultUnlockPage;