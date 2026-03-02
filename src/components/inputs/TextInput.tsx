type TextInputProps = {
  label?: string | undefined | null;
  text?: string | undefined | null;
  setText?: (text: string) => void;
  type?: string | undefined | null;

  id?: string | undefined | null;
  placeholder?: string | undefined | null;
  className?: string | undefined | null;
  autofocus?: boolean | undefined | null;
};

const TextInput = ({
  label,
  text,
  setText,
  type,
  id,
  placeholder = label,
  className,
  autofocus = false,
}: TextInputProps) => {
  return (
    <div className="grid gap-1">
      {label && (
        <label htmlFor={id || ""} className="text-secondary-10">
          {label}:
        </label>
      )}
      <input
        type={type || "text"}
        id={id || ""}
        value={text || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setText && setText(e.target.value)
        }
        autoFocus={autofocus ?? false}
        placeholder={placeholder || ""}
        className={`bg-primary-40 text-primary-0 border border-accent-0 rounded-4xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40 ${className || ""}`}
      />
    </div>
  );
};

export default TextInput;
