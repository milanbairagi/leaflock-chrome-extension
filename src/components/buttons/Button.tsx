type props = {
  children?: React.ReactNode;
  handleClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "tertiary";

  [key: string]: any;
};

const Button = ({
  children,
  handleClick,
  className,
  type,
  disabled,
  variant = "primary",
  ...props
}: props) => {

  const variantStyles = {
    primary: "text-white bg-accent-50 hover:bg-accent-70 disabled:bg-accent-20 active:bg-accent-90",
    secondary: "text-white bg-primary-40 hover:bg-primary-60 disabled:bg-primary-10 active:bg-primary-80",
    tertiary: "text-white bg-tertiary-50 hover:bg-tertiary-70 disabled:bg-tertiary-20 active:bg-tertiary-90",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`text-center rounded-4xl py-2 px-4 cursor-pointer transition-colors duration-200 ease-in-out disabled:cursor-not-allowed
              ${variantStyles[variant] || ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${className || ""}
            `}
      type={type || "button"}
      {...props}
    >
      { children }
    </button>
  );
};

export default Button;
