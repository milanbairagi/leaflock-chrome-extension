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
  return (
    <div className="grid gap-1">
      {label && (
        <label htmlFor={id || ""} className="text-secondary-10">
          {label}:
        </label>
      )}
      <input
        type="password"
        id={id || ""}
        value={password || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setPassword && setPassword(e.target.value)
        }
        placeholder={placeholder || ""}
        className={`bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40 ${className || ""}`}
        autoFocus={autofocus ?? false}
      />
    </div>
  );
};

export default PasswordInput;
