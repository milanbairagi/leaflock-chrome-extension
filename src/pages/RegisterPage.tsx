import { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import api from "../axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import { useUserCredential } from "../contexts/useUser";
import { useAxiosErrorHandler } from "../hooks/useAxiosErrorHandler";
import TextInput from "../components/inputs/TextInput";
import PasswordInput from "../components/inputs/PasswordInput";

interface props {
  goToHome: () => void;
  goToLogin: () => void;
}

interface UserType {
  id?: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  password?: string | null;
}

const RegisterPage: React.FC<props> = ({ goToHome, goToLogin }: props) => {
  const [userState, setUserState] = useState<UserType>({
    username: "",
    email: null,
    first_name: null,
    last_name: null,
    password: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } =
    useAuthCredential();
  const { user, isLoading } = useUserCredential() ?? {
    user: null,
    isLoading: true,
  };

  useEffect(() => {
    if (!isLoading && user) goToHome();
  }, [isLoading, user, goToHome]);

  const apiInstance = api(
    accessToken,
    refreshToken,
    vaultUnlockToken,
    setAuthTokens,
  );
  const { errorMessage, clearError, handleError } = useAxiosErrorHandler();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    try {
      const response: AxiosResponse<UserType> = await apiInstance.post(
        "/accounts/register/",
        userState,
      );

      if (response.status === 201) {
        goToLogin();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-md">
      {/* Header */}
      <div className="text-2xl font-semibold mb-6">
        <h3>Create Your</h3>
        <h3>LeafLock Account</h3>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        {/* Test */}
        {/* <p>Access Token: {accessToken}</p>
        <p>Refresh Token: {refreshToken}</p> */}

        <TextInput
          label="First Name"
          text={userState.first_name}
          setText={(val) => {
            setUserState({ ...userState, first_name: val });
          }}
          placeholder="First Name"
          autofocus={true}
        />

        <TextInput
          label="Last Name"
          text={userState.last_name}
          setText={(val) => {
            setUserState({ ...userState, last_name: val });
          }}
          placeholder="Last Name"
        />

        <TextInput
          label="Email"
          text={userState.email ?? undefined}
          setText={(val) => {
            setUserState({ ...userState, email: val });
          }}
          placeholder="Email"
          autofocus={true}
        />

        <TextInput
          label="Username"
          text={userState.username}
          setText={(val) => {
            setUserState({ ...userState, username: val });
          }}
          placeholder="Username"
          autofocus={true}
        />

        <PasswordInput
          label="Password"
          password={userState.password ?? undefined}
          setPassword={(val) => {
            setUserState({ ...userState, password: val });
          }}
          placeholder="Password"
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
          disabled={
            submitting ||
            !userState.username ||
            !userState.password ||
            !(userState.password?.length >= 5)
          }
        >
          {submitting ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="text-secondary-20 text-sm text-center mt-4">
        Already have an account?
        <span
          className="text-accent-20 cursor-pointer ml-1"
          onClick={goToLogin}
        >
          Login here
        </span>
      </p>
    </div>
  );
};

export default RegisterPage;
