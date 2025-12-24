const Button = ({ text, handleClick, styles }: {text: string, handleClick?: () => void, styles?: React.CSSProperties}) => {
  return (
    <button
      type="button"
      style={{ background: "#f0f0f0", padding: 4, ...styles }}
      onClick={handleClick}
    >
      {text}
    </button>
  );
};

export default Button;