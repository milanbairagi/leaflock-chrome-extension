import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../axios";
import { storageGet, storageRemove, storageSet } from "../utils/storage";
import { authHash } from "../utils/cryptography";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, PASSWORD_VERIFIER_KEY, SALT_KEY } from "../constants";
import { type AuthTokens } from "../types";

type NullableString = string | null;


/**
 * Send message to service worker and wait for response
 */
const sendMessageToBackground = <T,>(message: {
  type: string;
  payload?: unknown;
}): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response as T);
      }
    });
  });
};

type AuthCredentialContextValue = {
  isHydrated: boolean;

  accessToken: NullableString;
  refreshToken: NullableString;

  setAuthTokens: (tokens: AuthTokens) => Promise<void>;

  hasUnlockKey: boolean;
  unlockVault: (password: string, salt: string) => Promise<void>;
  lockVault: () => Promise<void>;
};

const AuthCredentialContext = createContext<AuthCredentialContextValue | null>(
  null
);

export const AuthCredentialProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [accessToken, setAccessToken] = useState<NullableString>(null);
  const [refreshToken, setRefreshToken] = useState<NullableString>(null);
  const [hasUnlockKey, setHasUnlockKey] = useState<boolean>(false);

  // Load initial state from session storage and SW
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Get tokens from service worker
        const [access, refresh, hasKeyResponse] =
          await Promise.all([
            storageGet(ACCESS_TOKEN_KEY, "session"),
            storageGet(REFRESH_TOKEN_KEY, "session"),
            sendMessageToBackground<{ success: boolean }>({
              type: "HAS_UNLOCK_KEY",
            }),
          ]);

        if (!isMounted) return;

        setHasUnlockKey(hasKeyResponse.success);
        setAccessToken(access);
        setRefreshToken(refresh);

      } catch (error) {
        console.warn("[AuthCredential] Failed to hydrate from service worker:", error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for vault lock events from service worker
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === "VAULT_LOCKED") {
        setHasUnlockKey(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const setAuthTokens = useCallback(async (tokens: AuthTokens) => {
    console.log("[AuthCredential] Setting auth tokens:", tokens);
    storageSet(ACCESS_TOKEN_KEY, tokens.accessToken, "session");
    storageSet(REFRESH_TOKEN_KEY, tokens.refreshToken, "session");
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);

    // Testing
    const access = await storageGet(ACCESS_TOKEN_KEY, "session");
    const refresh = await storageGet(REFRESH_TOKEN_KEY, "session");
    console.log("[AuthCredential] Tokens after setting:", { access, refresh });
  }, []);

  const unlockVault = useCallback(async (password: string, email: string) => {
    console.log("[AuthCredential] Unlocking vault with:", password, email);
    const hashPassword = await authHash(password, email);
    const apiInstance = api(null);

    let isOnline = navigator.onLine;

    // Check if offline unlock is possible
    let isOfflinePossible = false;
    const storedPasswordVerifier = await storageGet(PASSWORD_VERIFIER_KEY, "local");
    const storedSalt = await storageGet(SALT_KEY, "local");
    console.log("[AuthCredentail] salt, password verifier: ", storedSalt, storedPasswordVerifier);
    if (storedPasswordVerifier && storedSalt) {
      isOfflinePossible = true;
    }

    let onlineUnlockSuccess = false;
    async function onlineUnlock() {
      if (!isOnline) {
        throw new Error("Cannot perform online unlock while offline.");
      }
      const response = await apiInstance.post("/accounts/token/", {
        email,
        password: hashPassword,
      });
      if (response.status !== 200) {
        throw new Error(`Failed to unlock vault online: ${response.status}`);
      }

      // Update tokens in session storage and state
      const token: AuthTokens = {
        accessToken: response.data.access,
        refreshToken: response.data.refresh,
      };
      await setAuthTokens(token);

      // Get the salt from the server and use it to derive the vault unlock key
      const freshApi = api(token.accessToken);
      const responseSalt = await freshApi.get("/accounts/salt/");
      const salt = responseSalt.data.salt;

      // Store the password verifier and salt in local storage for offline unlock
      const passwordVerifier = await authHash(hashPassword, salt);
      await storageSet(PASSWORD_VERIFIER_KEY, passwordVerifier, "local");
      await storageSet(SALT_KEY, salt, "local");

      // Unlock the vault with the derived key
      await sendMessageToBackground({
        type: "UNLOCK_VAULT",
        payload: { password, salt },
      });
      setHasUnlockKey(true);
      onlineUnlockSuccess = true;
    }

    async function offlineUnlock() {
      if (!isOfflinePossible) {
        throw new Error("Cannot perform offline unlock without password verifier and salt.");
      }
      if (await authHash(hashPassword, storedSalt) !== storedPasswordVerifier) {
        throw new Error("Password does not match verifier.");
      }
      // Unlock the vault with the stored salt
      await sendMessageToBackground({
        type: "UNLOCK_VAULT",
        payload: { password, salt: storedSalt },
      });
      setHasUnlockKey(true);
    }

    try {
      console.log("[AuthCredential] Attempting to unlock vault. Online:", isOnline, "Offline possible:", isOfflinePossible);
      await onlineUnlock();
    } catch (error) {
      if (isOfflinePossible && !onlineUnlockSuccess) {
        console.log("[AuthCredential] Online unlock failed or not possible. Attempting offline unlock.");
        await offlineUnlock();
      }
    }

  }, []);

  const lockVault = useCallback(async () => {
    await sendMessageToBackground({
      type: "LOCK_VAULT",
    });
    setAccessToken(null);
    setRefreshToken(null);
    setHasUnlockKey(false);
    storageRemove(ACCESS_TOKEN_KEY, "session");
    storageRemove(REFRESH_TOKEN_KEY, "session");
  }, []);

  const value = useMemo<AuthCredentialContextValue>(
    () => ({
      isHydrated,
      accessToken,
      refreshToken,
      setAuthTokens,
      hasUnlockKey,
      unlockVault,
      lockVault,
    }),
    [
      isHydrated,
      accessToken,
      refreshToken,
      setAuthTokens,
      hasUnlockKey,
      unlockVault,
      lockVault,
    ]
  );

  return (
    <AuthCredentialContext.Provider value={value}>
      {children}
    </AuthCredentialContext.Provider>
  );
};

export const useAuthCredential = (): AuthCredentialContextValue => {
  const context = useContext(AuthCredentialContext);
  if (!context) {
    throw new Error(
      "useAuthCredential must be used within an AuthCredentialProvider"
    );
  }
  return context;
};
