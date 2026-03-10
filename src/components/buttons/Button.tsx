type props = {
  text: string;
  handleClick?: () => void;
  styles?: string;
  type?: "button" | "submit" | "reset";
  isDisable?: boolean;
};

const Button = ({
  text,
  handleClick,
  styles,
  type,
  isDisable = false,
}: props) => {
  return (
    <button
      type={type || "button"}
      className={`${styles} text-sm bg-primary-70 text-secondary-10 rounded-md px-2 py-1 hover:bg-primary-50 transition-colors duration-200 ease-in-out`}
      onClick={handleClick}
      disabled={isDisable}
    >
      {text}
    </button>
  );
};

export default Button;
