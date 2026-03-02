import { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import api from "../axios";
import {
  useAuthCredential,
  type AuthTokens,
} from "../contexts/useAuthCredential";
import { useUserCredential } from "../contexts/useUser";
import { useAxiosErrorHandler } from "../hooks/useAxiosErrorHandler";
import logo from "../assets/images/Logo.svg";
import TextInput from "../components/inputs/TextInput";
import PasswordInput from "../components/inputs/PasswordInput";

interface props {
  goToHome: () => void;
  goToRegister: () => void;
}

const LoginPage: React.FC<props> = ({ goToHome, goToRegister }: props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    errorMessage,
    setErrorMessage,
    isAuthError,
    handleError,
    clearError,
  } = useAxiosErrorHandler();

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
    setAuthTokens,
  );

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    try {
      const response: AxiosResponse<LoginResponseData> = await apiInstance.post(
        "/accounts/token/",
        {
          username: username,
          password: password,
        },
      );
      const token: AuthTokens = {
        accessToken: response.data.access,
        refreshToken: response.data.refresh,
      };
      await setAuthTokens(token);
    } catch (error) {
      handleError(error);
      if (isAuthError.current) {
        setErrorMessage("Invalid username or password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-md h-full">
      <div className="flex justify-center items-center flex-col mb-8">
        <img src={logo} alt="Leaflock Logo" className="w-40 mx-auto -mb-2" />
        <p className="text-center">Secure Password Manager</p>
      </div>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {/* Test */}
        {/* <p>Access Token: {accessToken}</p>
        <p>Refresh Token: {refreshToken}</p> */}

        <TextInput
          label="Username"
          text={username}
          setText={setUsername}
          placeholder="Enter your username"
        />

        <PasswordInput
          label="Password"
          password={password}
          setPassword={setPassword}
          placeholder="Enter your password"
        />

        {errorMessage && (
          <div className="text-red-400 text-sm text-center font-light">
            <p>{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          className="text-center text-white bg-accent-50 rounded-4xl py-2 mt-4 cursor-pointer 
                      hover:bg-accent-70
                      disabled:bg-accent-20 disabled:cursor-not-allowed
                      active:bg-accent-90
                      transition-colors duration-200 ease-in-out
          "
          disabled={!username || !(password.length >= 5) || submitting}
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="text-accent-20 cursor-pointer text-center text-md mt-4">
        Forgot Password?
      </p>

      <p className="text-secondary-20 text-sm text-center mt-4">
        Don't have an account?
        <span
          className="text-accent-20 cursor-pointer ml-1"
          onClick={goToRegister}
        >
          Register here
        </span>
      </p>
    </div>
  );
};

export default LoginPage;
