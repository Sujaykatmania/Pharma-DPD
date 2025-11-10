import { signOut } from "firebase/auth";
import { auth } from './firebase';
import { Profile } from './Profile.jsx';
import PropTypes from 'prop-types';

const HomePage = ({ user }) => {

    const handleSignOut = () => {
        signOut(auth).catch((error) => {
            console.error("Error signing out: ", error);
        });
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="w-full backdrop-filter backdrop-blur-2xl bg-white/20 rounded-2xl p-8 shadow-2xl border border-white/40">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome, {user.email}</h1>
                    <Profile />
                    <button
                        onClick={handleSignOut}
                        className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

HomePage.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired,
  }).isRequired,
};

export { HomePage };
