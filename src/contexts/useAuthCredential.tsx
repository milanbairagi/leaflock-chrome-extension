import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios, { type AxiosResponse } from "axios";

type NullableString = string | null;

const REFRESH_TOKEN_STORAGE_KEY = "leaflock.refreshToken";
const BASE_API_URL = import.meta.env.VITE_API_BASE_URL;

let currentAccessToken: NullableString = null;

export const getAccessToken = (): NullableString => currentAccessToken;

const chromeStorageLocal = (): {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
} | null => {
  const chromeAny = (globalThis as unknown as { chrome?: any }).chrome;
  const local = chromeAny?.storage?.local;
  if (!local) return null;

  const promisify = <T,>(fn: (cb: (result: T) => void) => void) =>
    new Promise<T>((resolve) => fn(resolve));

  return {
    get: async (keys) =>
      promisify<Record<string, unknown>>((cb) => local.get(keys, cb)),
    set: async (items) => promisify<void>((cb) => local.set(items, cb)),
    remove: async (keys) => promisify<void>((cb) => local.remove(keys, cb)),
  };
};

const readStoredRefreshToken = async (): Promise<NullableString> => {
  const storage = chromeStorageLocal();
  if (storage) {
    const result = await storage.get(REFRESH_TOKEN_STORAGE_KEY);
    const value = result[REFRESH_TOKEN_STORAGE_KEY];
    return typeof value === "string" ? value : null;
  }

  try {
    const value = globalThis.localStorage?.getItem(REFRESH_TOKEN_STORAGE_KEY);
    return value ?? null;
  } catch {
    return null;
  }
};

const writeStoredRefreshToken = async (
  token: NullableString
): Promise<void> => {
  const storage = chromeStorageLocal();
  if (storage) {
    if (token) {
      await storage.set({ [REFRESH_TOKEN_STORAGE_KEY]: token });
    } else {
      await storage.remove(REFRESH_TOKEN_STORAGE_KEY);
    }
    return;
  }

  try {
    if (!globalThis.localStorage) return;
    if (token) {
      globalThis.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      globalThis.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    console.warn("Unable to access localStorage");
  }
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

type AuthCredentialContextValue = {
  isHydrated: boolean;

  accessToken: NullableString;
  refreshToken: NullableString;

  setAuthTokens: (tokens: AuthTokens) => Promise<void>;
  clearAuthTokens: () => Promise<void>;

  vaultUnlockToken: NullableString;
  unlockVault: (token: string) => void;
  lockVault: () => void;
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
  const [vaultUnlockToken, setVaultUnlockToken] = useState<NullableString>(null);

  const hasAttemptedBootstrapRefresh = useRef(false);

  useEffect(() => {
    currentAccessToken = accessToken;
    return () => {
      currentAccessToken = null;
    };
  }, [accessToken]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const storedRefresh = await readStoredRefreshToken();
      if (!isMounted) return;
      setRefreshToken(storedRefresh);
      setIsHydrated(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // If we have a refresh token but no access token,
  // silently bootstrap a fresh access token once.
  useEffect(() => {
    if (!isHydrated) return;
    if (!refreshToken) return;
    if (accessToken) return;
    if (hasAttemptedBootstrapRefresh.current) return;

    hasAttemptedBootstrapRefresh.current = true;
    let isMounted = true;

    (async () => {
      try {
        const res: AxiosResponse<{ access: string }> = await axios.post(
          `${BASE_API_URL}accounts/token/refresh/`,
          { refresh: refreshToken },
          { timeout: 10000 }
        );
        if (!isMounted) return;
        setAccessToken(res.data.access);
      } catch {
        if (!isMounted) return;
        // Refresh token invalid/expired; clear to force login.
        setAccessToken(null);
        setRefreshToken(null);
        await writeStoredRefreshToken(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isHydrated, refreshToken, accessToken]);

  const setAuthTokens = useCallback(async (tokens: AuthTokens) => {
    setAccessToken(tokens.accessToken);
    if (typeof tokens.refreshToken === "string") {
      setRefreshToken(tokens.refreshToken);
      await writeStoredRefreshToken(tokens.refreshToken);
    }
  }, []);

  const clearAuthTokens = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    await writeStoredRefreshToken(null);
  }, []);

  const unlockVault = useCallback((token: string) => {
    setVaultUnlockToken(token);
  }, []);

  const lockVault = useCallback(() => {
    setVaultUnlockToken(null);
  }, []);

  const value = useMemo<AuthCredentialContextValue>(
    () => ({
      isHydrated,
      accessToken,
      refreshToken,
      setAuthTokens,
      clearAuthTokens,
      vaultUnlockToken,
      unlockVault,
      lockVault,
    }),
    [
      isHydrated,
      accessToken,
      refreshToken,
      setAuthTokens,
      clearAuthTokens,
      vaultUnlockToken,
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
