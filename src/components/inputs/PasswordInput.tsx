import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type PasswordInputProps = {
  label?: string | undefined | null;
  password?: string | undefined | null;
  setPassword?: (password: string) => void;

  id?: string | undefined | null;
  placeholder?: string | undefined | null;
  className?: string | undefined | null;
  autofocus?: boolean | undefined | null;
};

const PasswordInput = ({
  label,
  password,
  setPassword,
  id,
  placeholder,
  className,
  autofocus = false,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword((prev) => !prev);
  return (
    <div className="grid gap-1">
      {label && (
        <label htmlFor={id || ""} className="text-secondary-10">
          {label}:
        </label>
      )}
      <div
        className={`flex justify-center items-center bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent-40 ${className || ""}`}
      >
        <input
          type={showPassword ? "text" : "password"}
          id={id || ""}
          value={password || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPassword && setPassword(e.target.value)
          }
          placeholder={placeholder || ""}
          className="border-0 outline-0 flex-1"
          autoFocus={autofocus ?? false}
        />

        <div
          className="flex items-center cursor-pointer pl-2"
          onClick={toggleShowPassword}
        >
          {showPassword ? (
            <FaEye className="h-4 w-4 text-primary-90" />
          ) : (
            <FaEyeSlash className="h-4 w-4 text-primary-90" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordInput;
