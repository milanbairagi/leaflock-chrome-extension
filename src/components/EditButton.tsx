
const EditButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button onClick={onClick}>Edit</button>
  );
};

export default EditButton;