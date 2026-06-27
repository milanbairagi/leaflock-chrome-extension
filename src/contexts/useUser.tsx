import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../axios";
import { type AxiosInstance, type AxiosResponse } from "axios";
import { useAuthCredential } from "./useAuthCredential";
import { type User } from "../types";

interface ContextResponse {
  user: User | null;
  isLoading: boolean;
  handleLogout : () => Promise<void>;
};

const fetchUserData = async (api: AxiosInstance): Promise<User> => {
  try {
    const res: AxiosResponse<User> = await api.get<User>("accounts/me/");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    throw error;
  }
};


const UserCredentialContext = createContext<ContextResponse | null>(null);

export const UserCredentialProvider = ({ children, }: {children: ReactNode;}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const {accessToken, refreshToken, lockVault} = useAuthCredential();
  const apiInstance = useMemo(
    () => api(accessToken),
    [accessToken]
  );

  useEffect(() => {
    let isMounted = true;

    if (!accessToken || !refreshToken) {
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
  }, [refreshToken, apiInstance]);

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