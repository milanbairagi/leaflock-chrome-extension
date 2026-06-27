import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type AuthTokens } from "../types";

type NullableString = string | null;
interface BackgroundMsgResType {
  success: boolean;
  [key: string]: unknown;
}

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

  // Load initial state from service worker
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Get tokens from service worker
        const [accessResponse, refreshResponse, vaultResponse] = await Promise.all([
          sendMessageToBackground<{ accessToken: string | null }>({
            type: "GET_ACCESS_TOKEN",
          }),
          sendMessageToBackground<{ refreshToken: string | null }>({
            type: "GET_REFRESH_TOKEN",
          }),
          sendMessageToBackground<{ vaultUnlockKey: CryptoKey | null }>({
            type: "GET_VAULT_UNLOCK_KEY",
          }),
        ]);

        if (!isMounted) return;

        setAccessToken(accessResponse.accessToken);
        setRefreshToken(refreshResponse.refreshToken);
        setVaultUnlockKey(vaultResponse.vaultUnlockKey);
        setIsHydrated(true);
      } catch (error) {
        console.error("[AuthCredential] Failed to hydrate from service worker:", error);
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
    const response: BackgroundMsgResType = await sendMessageToBackground({
      type: "SET_AUTH_TOKENS",
      payload: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
    if (response.success) {
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
    } else {
      throw new Error("Failed to set auth tokens in background");
    }
  }, []);

  const unlockVault = useCallback(async (vaultUnlockKey: CryptoKey) => {
    setVaultUnlockKey(vaultUnlockKey);
    await sendMessageToBackground({
      type: "UNLOCK_VAULT",
      payload: { key: vaultUnlockKey },
    });
  }, []);

  const lockVault = useCallback(async () => {
    setVaultUnlockKey(null);
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
