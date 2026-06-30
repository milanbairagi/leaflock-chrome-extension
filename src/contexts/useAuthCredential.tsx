import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { storageGet, storageRemove, storageSet } from "../utils/storage";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, UNLOCK_TIMESTAMP_KEY, UNLOCK_DURATION } from "../constants";
import { type AuthTokens } from "../types";

type NullableString = string | null;

// Module-level variable for axios interceptor
let currentAccessToken: NullableString = null;

export const getAccessToken = (): NullableString => currentAccessToken;

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

  vaultUnlockKey: CryptoKey | null;
  unlockVault: (vaultUnlockKey: CryptoKey) => Promise<void>;
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
  const [vaultUnlockKey, setVaultUnlockKey] = useState<CryptoKey | null>(null);

  // Sync currentAccessToken for axios interceptor
  useEffect(() => {
    currentAccessToken = accessToken;
    return () => {
      currentAccessToken = null;
    };
  }, [accessToken]);

  // Load initial state from session storage and SW
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Get tokens from service worker
        const [access, refresh, vaultResponse, unlockTimestamp] =
          await Promise.all([
            storageGet(ACCESS_TOKEN_KEY, "session"),
            storageGet(REFRESH_TOKEN_KEY, "session"),
            sendMessageToBackground<{
              success: boolean;
              vaultUnlockKey: CryptoKey | null;
            }>({
              type: "GET_VAULT_UNLOCK_KEY",
            }),
            storageGet(UNLOCK_TIMESTAMP_KEY, "session"),
          ]);

        if (!isMounted) return;
        
        if (unlockTimestamp) {
          const currentTime = Date.now();
          if (currentTime - unlockTimestamp > UNLOCK_DURATION) {
            // Vault unlock key has expired, clear it
            setVaultUnlockKey(null);
            console.log("[AuthCredential] Vault unlock key expired, clearing it");
            await sendMessageToBackground({
              type: "LOCK_VAULT",
            });
          } else {
            setAccessToken(access);
            setRefreshToken(refresh);
            setVaultUnlockKey(vaultResponse.vaultUnlockKey);
          }
        }

      } catch (error) {
        console.error("[AuthCredential] Failed to hydrate from service worker:", error);
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
        setVaultUnlockKey(null);
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

  const unlockVault = useCallback(async (vaultUnlockKey: CryptoKey) => {
    console.log("[AuthCredential] Unlocking vault with key:", vaultUnlockKey);
    setVaultUnlockKey(vaultUnlockKey);
    await sendMessageToBackground({
      type: "UNLOCK_VAULT",
      payload: { key: vaultUnlockKey },
    });
  }, []);

  const lockVault = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setVaultUnlockKey(null);
    storageRemove(ACCESS_TOKEN_KEY, "session");
    storageRemove(REFRESH_TOKEN_KEY, "session");
    await sendMessageToBackground({
      type: "LOCK_VAULT",
    });
  }, []);

  const value = useMemo<AuthCredentialContextValue>(
    () => ({
      isHydrated,
      accessToken,
      refreshToken,
      setAuthTokens,
      vaultUnlockKey,
      unlockVault,
      lockVault,
    }),
    [
      isHydrated,
      accessToken,
      refreshToken,
      setAuthTokens,
      vaultUnlockKey,
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
