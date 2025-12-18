import axios from "axios";
import { useAuthCredential } from "./hooks/useAuthCredential";


const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();
const url = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (vaultUnlockToken) {
      config.headers["X-Vault-Unlock-Token"] = vaultUnlockToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;

    // If the error is a 401 Unauthorized and the request has not been retried yet
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      if (refreshToken) {
        try {
          const response = await api.post(
            `${url}/token/refresh/`,
            {
              refresh: refreshToken,
            }
          );
      setAuthTokens({ accessToken: response.data.access, refreshToken });

          config.headers.Authorization = `Bearer ${response.data.access}`;
          return api(config);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;