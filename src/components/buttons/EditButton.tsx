
const EditButton = ({onClick, styles }: {onClick: () => void, styles?: string }) => {
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      className={`${styles} text-sm bg-primary-70 text-secondary-10 rounded-md px-2 py-1 hover:bg-primary-50 transition-colors duration-200 ease-in-out`}
      onClick={handleClick}
    >
      Edit
    </button>
  );
};

export default EditButton;