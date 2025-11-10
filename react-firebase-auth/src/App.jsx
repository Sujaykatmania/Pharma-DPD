import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase'; // Import auth from your firebase.js
import { LoginPage } from './LoginPage.jsx'; // Import your (working) LoginPage
import { HomePage } from './HomePage.jsx'; // Import the new HomePage

function App() {
  // These states will hold the user and loading status
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // This is the auth listener that was missing
  useEffect(() => {
    // onAuthStateChanged returns an "unsubscribe" function
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

    // Cleanup function to stop listening when the component unmounts
    return () => unsubscribe();
  }, []); // The empty array [] means this runs once on mount

  // 1. Show "Loading..." while the listener is checking
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h1 className="text-xl font-bold">Loading...</h1>
      </div>
    );
  }

  // 2. If not loading, and no user, show the LoginPage
  if (!user) {
    return <LoginPage />;
  }

  // 3. If not loading, and there IS a user, show the HomePage!
  return <HomePage user={user} />;
}

export default App;