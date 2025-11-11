import React, { useState, useEffect } from 'react'; // <-- We need 'React' for hooks
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase'; 
import { LoginPage } from './LoginPage.jsx'; 
import { HomePage } from './HomePage.jsx'; 
import { SplashScreen } from './SplashScreen.jsx'; // <-- Jules's new import

function App() {
  // --- All three states are needed ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true); // <-- Jules's new state

  // --- This is YOUR superior useEffect from 'main' ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setUser(user);
      } else {
        // User is signed out
        setUser(null);
      }
      // Finished loading
      setLoading(false);
    });

    // Cleanup function
    return () => unsubscribe();
  }, []); 

  // --- This is the new, combined render logic ---

  // 1. Show Splash Screen first (from Jules)
  if (showSplash) {
    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  // 2. Show YOUR styled Loading screen (from 'main')
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h1 className="text-xl font-bold">Loading...</h1>
      </div>
    );
  }

  // 3. The rest of the logic, which was the same
  if (!user) {
    return <LoginPage />;
  }

  // 4. Show the HomePage
  return <HomePage user={user} />;
}

export default App;