import axios from "axios";
import type { AxiosInstance } from "axios";

type NullableString = string | null;

const api = (token: NullableString): AxiosInstance => {

  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
  });

  instance.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  return instance;
}

export default api;