import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../axios";
import { type AxiosInstance, type AxiosResponse } from "axios";
import { useAuthCredential } from "./useAuthCredential";
import { storageGet, storageSet } from "../utils/storage";
import { USER_DATA_KEY } from "../constants";
import { type User } from "../types";

interface ContextResponse {
  user: User | null;
  isLoading: boolean;
  handleLogout : () => Promise<void>;
};

const fetchUserData = async (api: AxiosInstance): Promise<User> => {
  try {
    // Try online first
    console.log("[User] Trying fetching user data");
    const res: AxiosResponse<User> = await api.get<User>("accounts/me/");
    console.log("[User] fetch response: ", res);
    await storageSet(USER_DATA_KEY, res.data, "local");
    return res.data;
  } catch (error) {
    console.log("Failed to fetch user data:", error);
    // If online fetch fails, try offline
    const storedUserData = await storageGet(USER_DATA_KEY, "local");
    console.log("[User] Got stored user data: ", storedUserData);
    if (storedUserData) {
      return storedUserData as User;
    } else {
      throw new Error("No user data available offline.");
    }
    
  }
};


const UserCredentialContext = createContext<ContextResponse | null>(null);

export const UserCredentialProvider = ({ children, }: {children: ReactNode;}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const {accessToken, hasUnlockKey, lockVault} = useAuthCredential();
  const apiInstance = useMemo(
    () => api(accessToken),
    [accessToken]
  );

  useEffect(() => {
    let isMounted = true;

    if (!hasUnlockKey) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Fetch user data
    (async () => {
      try {
        setIsLoading(true);
        if (!isMounted) return;
        const userData: User = await fetchUserData(apiInstance);
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accessToken, hasUnlockKey, apiInstance]);

  const handleLogout = async () => {
    await lockVault();
    setUser(null);
  };

  return (
    <UserCredentialContext.Provider value={{ user, isLoading, handleLogout }}>
      {children}
    </UserCredentialContext.Provider>
  );
};

export const useUserCredential = (): ContextResponse | null => {
  const context: ContextResponse | null = useContext(UserCredentialContext);
  return context;
};