import { useState } from "react";
import type { AxiosResponse } from "axios";
import api from "../axios";
import { useAuthCredential, type AuthTokens } from "../contexts/useAuthCredential";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();
  
  interface LoginResponseData {
    access: string;
    refresh: string;
  };
  const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response: AxiosResponse<LoginResponseData> = await apiInstance.post(
        "/accounts/token/",
        {
          username: username,
          password: password,
        }
      );
      const token: AuthTokens = {accessToken: response.data.access, refreshToken: response.data.refresh};
      await setAuthTokens(token);

      console.log("Login successful:", response.data);
      console.log("Access Token:", response.data.access);
      console.log("Refresh Token:", response.data.refresh);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div>
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          handleLogin(e);
        }}
      >
        <h1>Login Page</h1>
        {/* Test */}
        <p>Access Token: {accessToken}</p>
        <p>Refresh Token: {refreshToken}</p>
        <label htmlFor="username">Username: </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUsername(e.target.value)
          }
        />
        <br />
        <label htmlFor="password">Password: </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
