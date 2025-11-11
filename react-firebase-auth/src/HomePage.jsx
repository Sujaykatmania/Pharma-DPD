import React from 'react';
import { signOut } from "firebase/auth";
import { auth } from './firebase';
import { Profile } from './Profile.jsx';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

const HomePage = ({ user }) => {

    const handleSignOut = () => {
        signOut(auth).catch((error) => {
            console.error("Error signing out: ", error);
        });
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="relative w-full backdrop-filter backdrop-blur-xl bg-white/20 shadow-2xl border border-white/30 rounded-2xl p-8 overflow-hidden">
                    {/* --- Pill Nav --- */}
                    <div className="mb-6">
                     <div className="flex justify-center bg-white/20 p-1.5 rounded-full shadow-inner-lg">
                      {/* Active Pill */}
                      <button className="flex-1 bg-white/60 text-slate-800 font-bold py-2 px-6 rounded-full shadow-md border border-white/30">
                        Profile
                      </button>
                    {/* Inactive Pill (for the future) */}
                      <button className="flex-1 text-slate-700 font-medium py-2 px-6 rounded-full hover:bg-white/30 active:scale-95">
                        Scanner
                      </button>
                      <button className="flex-1 text-slate-700 font-medium py-2 px-6 rounded-full hover:bg-white/30 active:scale-95">
                        Reminders
                      </button>
                    </div>
                    </div>
                    {/* --- End Pill Nav --- */}
                    <Profile />
                    <button
                        onClick={handleSignOut}
                        className="mt-6 w-full bg-gradient-to-br from-red-600/80 to-red-800/80 hover:from-red-600 hover:to-red-800 text-white font-bold py-2 px-4 rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
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
