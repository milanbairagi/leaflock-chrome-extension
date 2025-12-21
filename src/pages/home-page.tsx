import { useUserCredential } from "../contexts/useUser";


interface props {
  goToLogin: () => void;
};

const HomePage = ({ goToLogin }: props) => {
  const { user, isLoading, handleLogout } = useUserCredential() ?? { user: null, isLoading: true, handleLogout: async () => {void 0} };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isLoading && !user)  {
    goToLogin();
    return null;
  }

  return (
    <div>
      {(user) ? <h3>Welcome! {user.username}</h3> : <h3>Please Login!</h3>}
      <div>Password Lists</div>
      <ol>
        <li>Password 1</li>
        <li>Password 2</li>
        <li>Password 3</li>
        <li>Password 4</li>
        <li>Password 5</li>
      </ol>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HomePage;
