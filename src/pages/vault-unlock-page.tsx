import { useState } from "react";
import { useUserCredential } from "../contexts/useUser";


interface props {
  goToLogin: () => void;
};

const VaultUnlockPage: React.FC<props> = ({ goToLogin }) => {
  const [masterPassword, setMasterPassword] = useState<string>("");
  const { user, isLoading } = useUserCredential() ?? { user: null, isLoading: true };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  
  if (!user)  {
    goToLogin();
    return null;
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
      <button>Unlock</button>
    </div>
  );
};

export default VaultUnlockPage;