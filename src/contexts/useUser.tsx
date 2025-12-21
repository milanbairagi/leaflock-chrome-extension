import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../axios";
import { type AxiosInstance, type AxiosResponse } from "axios";
import { useAuthCredential } from "./useAuthCredential";

export type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
};

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
  const {accessToken, refreshToken, setAuthTokens, clearAuthTokens} = useAuthCredential();
  const apiInstance = useMemo(
    () => api(accessToken, refreshToken, null, setAuthTokens),
    [accessToken, refreshToken, setAuthTokens]
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (!refreshToken) {
      setUser(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        const userData: User = await fetchUserData(apiInstance);
        if (isMounted) setUser(userData);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshToken, apiInstance]);

  const handleLogout = async () => {
    await clearAuthTokens();
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