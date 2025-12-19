import axios from "axios";
import type { AxiosInstance } from "axios";

import type { AuthTokens } from "./contexts/useAuthCredential";


type NullableString = string | null;

const api = (
  accessToken: NullableString,
  refreshToken: NullableString,
  vaultUnlockToken: NullableString,
  setAuthTokens: (tokens: AuthTokens) => Promise<void>
): AxiosInstance => {

  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
  });

  instance.interceptors.request.use(
    (config) => {
      (accessToken) && (config.headers.Authorization = `Bearer ${accessToken}`);
      (vaultUnlockToken) && (config.headers["X-Vault-Unlock-Token"] = vaultUnlockToken);
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const config = error.config;

      // If the error is a 401 Unauthorized and the request has not been retried yet
      if (error.response?.status === 401 && config && !config._retry) {
        config._retry = true;
        if (refreshToken) {
          try {
            const response = await instance.post(
              `/token/refresh/`,
              {
                refresh: refreshToken,
              }
            );
            await setAuthTokens({ accessToken: response.data.access, refreshToken });

            config.headers.Authorization = `Bearer ${response.data.access}`;
            return instance(config);
          } catch (refreshError) {
            console.error("Refresh token failed:", refreshError);
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}


export default api;