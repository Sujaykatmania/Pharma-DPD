import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { LoginPage } from './LoginPage.jsx';
import { HomePage } from './HomePage.jsx';
import { SplashScreen } from './SplashScreen.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (showSplash) {
    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <HomePage user={user} />;
}

export default App;
