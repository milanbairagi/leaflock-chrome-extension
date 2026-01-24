import { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import api from "../axios";
import {
  useAuthCredential,
  type AuthTokens,
} from "../contexts/useAuthCredential";
import { useUserCredential } from "../contexts/useUser";
import logo from "../assets/images/Logo.svg";

interface props {
  goToHome: () => void;
  goToRegister: () => void;
}

const LoginPage: React.FC<props> = ({ goToHome, goToRegister }: props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } =
    useAuthCredential();
  const { user, isLoading } = useUserCredential() ?? {
    user: null,
    isLoading: true,
  };

  useEffect(() => {
    if (!isLoading && user) goToHome();
  }, [isLoading, user, goToHome]);

  interface LoginResponseData {
    access: string;
    refresh: string;
  }
  const apiInstance = api(
    accessToken,
    refreshToken,
    vaultUnlockToken,
    setAuthTokens
  );

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
      const token: AuthTokens = {
        accessToken: response.data.access,
        refreshToken: response.data.refresh,
      };
      await setAuthTokens(token);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="p-5 rounded-md h-full">
      <div className="flex justify-center items-center flex-col mb-8">
        <img src={logo} alt="Leaflock Logo" className="w-40 mx-auto -mb-2" />
        <p className="text-center">Secure Password Manager</p>
      </div>
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          handleLogin(e);
        }}
        className="flex flex-col gap-4"
      >
        {/* Test */}
        {/* <p>Access Token: {accessToken}</p>
        <p>Refresh Token: {refreshToken}</p> */}

        <div className="grid gap-1">
          <label htmlFor="username" className="text-secondary-10">
            Username:{" "}
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUsername(e.target.value)
            }
            autoFocus
            placeholder="Username"
            className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          />
        </div>

        <div className="grid gap-1">
          <label htmlFor="password" className="text-secondary-10">
            Password:{" "}
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          />
        </div>

        <button
          type="submit"
          className="text-center text-white bg-accent-50 rounded-4xl py-2 mt-4 cursor-pointer 
                      hover:bg-accent-70
                      disabled:bg-accent-20 disabled:cursor-not-allowed
                      active:bg-accent-90
                      transition-colors duration-200 ease-in-out
          "
          disabled={!username || !(password.length >= 5)}
        >
          Login
        </button>
      </form>

      <p className="text-accent-20 cursor-pointer text-center text-md mt-4">
        Forgot Password?
      </p>

      <p className="text-secondary-20 text-sm text-center mt-4">
        Don't have an account?
        <span className="text-accent-20 cursor-pointer ml-1" onClick={goToRegister}>
          Register here
        </span>
      </p>
    </div>
  );
};

export default LoginPage;
