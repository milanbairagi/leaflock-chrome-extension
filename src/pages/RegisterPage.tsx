import { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import api from "../axios";
import { useAuthCredential } from "../contexts/useAuthCredential";
import { useUserCredential } from "../contexts/useUser";


interface props {
  goToHome: () => void;
  goToLogin: () => void;
}

interface UserType {
  "id"?: number;
  "username": string;
  "email": string | null;
  "first_name": string | null;
  "last_name": string | null;
  "password"?: string | null;
};

const RegisterPage: React.FC<props> = ({ goToHome, goToLogin }: props) => {
  const [userState, setUserState] = useState<UserType>({
    username: "",
    email: null,
    first_name: null,
    last_name: null,
    password: null,
  });

  const { accessToken, refreshToken, vaultUnlockToken, setAuthTokens } = useAuthCredential();
  const { user, isLoading } = useUserCredential() ?? { user: null, isLoading: true };

  useEffect(() => {
    if (!isLoading && user) goToHome();
  }, [isLoading, user, goToHome]);
  

  const apiInstance = api(accessToken, refreshToken, vaultUnlockToken, setAuthTokens);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response: AxiosResponse<UserType> = await apiInstance.post(
        "/accounts/register/", userState
      );
      
      if (response.status === 201) {
        goToLogin();
      }
      
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  return (
    <div className="p-5 rounded-md">
      {/* Header */}
      <div className="text-2xl font-semibold mb-6">
        <h3>Create Your</h3>
        <h3>LeafLock Account</h3>
      </div>

      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          handleRegister(e);
        }}
        className="flex flex-col gap-4"
      >
        {/* Test */}
        {/* <p>Access Token: {accessToken}</p>
        <p>Refresh Token: {refreshToken}</p> */}

        <div className="grid gap-1">
          <label htmlFor="first-name" className="text-secondary-10">First Name: </label>
          <input
            type="text"
            id="first-name"
            value={userState.first_name ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserState({ ...userState, first_name: e.target.value })
            }
            autoFocus
            placeholder="First Name"
            className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          />
        </div>

        <div className="grid gap-1">
          <label htmlFor="last-name" className="text-secondary-10">Last Name: </label>
          <input
            type="text"
            id="last-name"
            value={userState.last_name ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserState({ ...userState, last_name: e.target.value })
            }
            placeholder="Last Name"
            className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          />
        </div>
        
        <div className="grid gap-1">
          <label htmlFor="email" className="text-secondary-10">Email: </label>
          <input
            type="text"
            id="email"
            value={userState.email ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserState({ ...userState, email: e.target.value })
            }
            placeholder="Email"
            className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          />
        </div>

        <div className="grid gap-1">
          <label htmlFor="username" className="text-secondary-10">Username: </label>
          <input
            type="text"
            id="username"
            value={userState.username ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserState({ ...userState, username: e.target.value })
            }
            placeholder="Username"
            className="bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40"
          />
        </div>

        <div className="grid gap-1">
          <label htmlFor="password" className="text-secondary-10">Password: </label>
          <input
            type="password"
            id="password"
            value={userState.password ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserState({ ...userState, password: e.target.value })
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
          disabled={!userState.username || !userState.password || !(userState.password?.length >= 5)}
        >
          Register
        </button>
      </form>

      
      <p className="text-secondary-20 text-sm text-center mt-4">
        Already have an account?
        <span className="text-accent-20 cursor-pointer ml-1" onClick={goToLogin}>
          Login here
        </span>
      </p>
    </div>
  );
};

export default RegisterPage;
