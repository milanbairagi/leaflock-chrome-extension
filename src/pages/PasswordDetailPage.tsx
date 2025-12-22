interface Props {
  id: number;
  goBack?: () => void;
}
const PasswordDetailPage: React.FC<Props> = ({ id, goBack }) => {
  return (
    <div>
      <button onClick={goBack}>Back to Home</button>
      <p>Displaying details for password with ID: {id}</p>
    </div>
  );
};

export default PasswordDetailPage;
