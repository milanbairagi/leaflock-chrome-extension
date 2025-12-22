const Button = ({ text, handleClick }: {text: string, handleClick?: () => void}) => {
  return (
    <button
      type="button"
      style={{ background: "#f0f0f0", padding: 4 }}
      onClick={handleClick}
    >
      {text}
    </button>
  );
};

export default Button;