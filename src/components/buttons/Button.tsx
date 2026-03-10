const Button = ({ text, handleClick, styles }: {text: string, handleClick?: () => void, styles?: React.CSSProperties}) => {
  return (
    <button
      type="button"
      className={`${styles} text-sm bg-primary-70 text-secondary-10 rounded-md px-2 py-1 hover:bg-primary-50 transition-colors duration-200 ease-in-out`}
      onClick={handleClick}
    >
      {text}
    </button>
  );
};

export default Button;