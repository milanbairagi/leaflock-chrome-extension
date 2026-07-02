import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { storageGet, storageRemove, storageSet } from "../utils/storage";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../constants";
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

  const unlockVault = useCallback(async (password: string, salt: string) => {
    console.log("[AuthCredential] Unlocking vault with:", password, salt);
    await sendMessageToBackground({
      type: "UNLOCK_VAULT",
      payload: { password, salt },
    });
    setHasUnlockKey(true);
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
