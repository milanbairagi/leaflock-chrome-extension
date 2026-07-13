import { useEffect, useState } from "react";
import { useAuthCredential } from "../contexts/useAuthCredential";
import { useUserCredential } from "../contexts/useUser";
import { storageGet } from "../utils/storage";
import { useAxiosErrorHandler } from "../hooks/useAxiosErrorHandler";
import logo from "../assets/images/Logo.svg";
import { USER_DATA_KEY } from "../constants";
import TextInput from "../components/inputs/TextInput";
import PasswordInput from "../components/inputs/PasswordInput";
import Button from "../components/buttons/Button";

interface props {
  goToHome: () => void;
  goToRegister: () => void;
}

const LoginPage: React.FC<props> = ({ goToHome, goToRegister }: props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    errorMessage,
    setErrorMessage,
    isAuthError,
    handleError,
    clearError,
  } = useAxiosErrorHandler();

  const { isHydrated, unlockVault, hasUnlockKey } = useAuthCredential();
  const { user, isLoading } = useUserCredential() ?? {
    user: null,
    isLoading: true,
  };

  useEffect(() => {
    storageGet(USER_DATA_KEY)
    .then((userData) => {
      if (userData && userData.email) {
        setEmail(userData.email);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    try {
      setSubmitting(true);
      console.log("[LoginPage] Attempting to unlock vault with email:", email);
      await unlockVault(password, email);

      goToHome();
    } catch (error) {
      handleError(error);
      if (isAuthError.current) {
        setErrorMessage("Invalid email or password.");
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (hasUnlockKey && user) {
    goToHome();
    return null;
  }

  if (!isHydrated) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="p-5 rounded-md h-full">
      <div className="flex justify-center items-center flex-col mb-8">
        <img src={logo} alt="Leaflock Logo" className="w-40 mx-auto -mb-2" />
        <p className="text-center">Secure Password Manager</p>
      </div>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <TextInput
          label="Email"
          text={email}
          setText={setEmail}
          placeholder="Enter your email"
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

        <Button
          type="submit"
          className="mt-4"
          disabled={!email || !(password.length >= 5) || submitting}
        >
          {submitting ? "Logging in..." : "Login"}
        </Button>
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
