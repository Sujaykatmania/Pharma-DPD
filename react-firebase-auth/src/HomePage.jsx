import React, { useState } from 'react';
import { signOut } from "firebase/auth";
import { auth } from './firebase';
import { Profile } from './Profile.jsx';
import PropTypes from 'prop-types';

import PillNav from './PillNav';
import logo from './logo.svg';

import { ScannerPage } from './ScannerPage.jsx';
import { RemindersPage } from './RemindersPage.jsx';

const HomePage = ({ user }) => {
  const [activePage, setActivePage] = useState('#profile');
  const [isAppBusy, setIsAppBusy] = useState(false);

  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  const navItems = [
    { label: 'Profile', href: '#profile' },
    { label: 'Scanner', href: '#scanner' },
    { label: 'Reminders', href: '#reminders' },
  ];

  const renderActivePage = () => {
    switch (activePage) {
      case '#profile':
        return <Profile user={user} />;
      case '#scanner':
        return <ScannerPage user={user} setIsAppBusy={setIsAppBusy} />;
      case '#reminders':
        return <RemindersPage user={user} />;
      default:
        return <Profile user={user} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200 p-4 pt-24">
      <PillNav
        logo={logo}
        logoAlt="Pharma-DPD Logo"
        items={navItems}
        activeHref={activePage}
        onItemClick={(href) => setActivePage(href)}
        baseColor="rgba(255, 255, 255, 0.2)"
        pillColor="#FFFFFF"
        pillTextColor="#0d0e1b"
        hoveredPillTextColor="#0d0e1b"
        initialLoadAnimation={false}
        disabled={isAppBusy}
      />

      <div className="max-w-4xl mx-auto">
        <div className="w-full backdrop-filter backdrop-blur-xl bg-white/20 shadow-2xl border border-white/30 rounded-2xl p-8">
          {renderActivePage()}
          <button
            onClick={handleSignOut}
            className="mt-6 w-full bg-gradient-to-br from-red-400/80 to-red-600/80 hover:from-red-400 hover:to-red-600 text-white font-bold py-2 px-4 rounded-md shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl active:scale-95"
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
