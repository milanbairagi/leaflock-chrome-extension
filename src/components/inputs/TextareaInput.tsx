type props = {
  label?: string | undefined | null;
  text?: string | undefined | null;
  setText?: (text: string) => void;
  name?: string | undefined | null;

  id?: string | undefined | null;
  placeholder?: string | undefined | null;
  className?: string | undefined | null;
  autofocus?: boolean | undefined | null;

  borderType?: "rounded" | "square" | "pill" | undefined | null;
};

const TextareaInput = ({
  label,
  text,
  setText,
  name,
  id,
  placeholder = label,
  className,
  autofocus = false,
}: props) => {
  return (
    <div className="grid gap-1">
      {label && (
        <label htmlFor={id || ""} className="text-secondary-10">
          {label}:
        </label>
      )}
      <textarea
        name={name || ""}
        id={id || ""}
        value={text || ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setText && setText(e.target.value)
        }
        autoFocus={autofocus ?? false}
        placeholder={placeholder || ""}
        className={`bg-primary-40 text-primary-0 border border-accent-0 rounded-2xl w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-40 ${className || ""}`}
        rows={4}
      >
        {text}
      </textarea>
    </div>
  );
};

export default TextareaInput;
