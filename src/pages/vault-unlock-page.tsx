import { useState } from "react";

const VaultUnlockPage: React.FC = () => {
  const [masterPassword, setMasterPassword] = useState<string>("");

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