
const EditButton = ({onClick, styles }: {onClick: () => void, styles?: React.CSSProperties }) => {
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <button onClick={handleClick} style={{ background: "#f0f0f0", padding: 4, zIndex: 1, ...styles }}>Edit</button>
  );
};

export default EditButton;