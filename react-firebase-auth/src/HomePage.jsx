import React from 'react';
import { signOut } from "firebase/auth";
import { auth } from './firebase';
import { Profile } from './Profile.jsx';

const HomePage = ({ user }) => {

    const handleSignOut = () => {
        signOut(auth).catch((error) => {
            console.error("Error signing out: ", error);
        });
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200">
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="backdrop-filter backdrop-blur-lg bg-white/30 rounded-lg p-8 shadow-lg">
                    <Profile />
                    <button
                        onClick={handleSignOut}
                        className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export { HomePage };
