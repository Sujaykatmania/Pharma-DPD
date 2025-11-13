import React, { useState } from 'react';
import { signOut } from "firebase/auth";
import { auth } from './firebase';
import { Profile } from './Profile.jsx';
import PropTypes from 'prop-types';

import PillNav from './PillNav';
import logo from './logo.svg';

// --- FIX: Import the REAL ScannerPage ---
import { ScannerPage } from './ScannerPage.jsx';

import { RemindersPage } from './RemindersPage.jsx';

const HomePage = ({ user }) => {
  // State to track which page is active
  const [activePage, setActivePage] = useState('#profile');
  const [isAppBusy, setIsAppBusy] = useState(false);

  const handleSignOut = () => {
      signOut(auth).catch((error) => {
          console.error("Error signing out: ", error);
      });
  };

  // The navigation items for our new PillNav
  const navItems = [
    { label: 'Profile', href: '#profile' },
    { label: 'Scanner', href: '#scanner' },
    { label: 'Reminders', href: '#reminders' },
  ];

  // Helper function to render the correct page
  const renderActivePage = () => {
    switch (activePage) {
      case '#profile':
        return <Profile />;
      // --- FIX: Render the REAL ScannerPage ---
      case '#scanner':
        return <ScannerPage setIsAppBusy={setIsAppBusy} />;
      case '#reminders':
        return <RemindersPage />;
      default:
        return <Profile />;
    }
  };

  return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200 p-4 pt-24"> {/* Added pt-24 for nav */}
          
          {/* --- This is the new PillNav Component --- */}
          <PillNav
            logo={logo}
            logoAlt="Pharma-DPD Logo"
            items={navItems}
            activeHref={activePage}
            onItemClick={(href) => setActivePage(href)} // This updates our state
            baseColor="rgba(255, 255, 255, 0.2)" // Main glass color
            pillColor="#FFFFFF" // Active pill color
            pillTextColor="#0d0e1b" // Active pill text color (dark)
            hoveredPillTextColor="#0d0e1b" // Hovered pill text color (dark)
            initialLoadAnimation={false} // Disable default load animation
            disabled={isAppBusy} // Pass down the app busy state
          />
          {/* --- End PillNav Component --- */}
          
          <div className="max-w-4xl mx-auto">
              {/* This is our main "pop-out" glass panel */}
              <div className="w-full backdrop-filter backdrop-blur-xl bg-white/20 shadow-2xl border border-white/30 rounded-2xl p-8">
                  
                  {/* Render the active page inside the panel */}
                  {renderActivePage()}
                  
                  {/* Sign Out button is now at the bottom */}
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