// This is the "classic" (non-module) way to import
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// --- PASTE YOUR REAL CONFIG OBJECT HERE ---
// (The same one from src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyAYcfF9wWuqXsqFWgNxHFbN9Z8vAQE4gek",
  authDomain: "pharma-dpd.firebaseapp.com",
  projectId: "pharma-dpd",
  storageBucket: "pharma-dpd.firebasestorage.app",
  messagingSenderId: "918004985669",
  appId: "1:918004985669:web:f9d48e47e64caa32c5182c",
  measurementId: "G-DCL3M7FP6W"
};
// ------------------------------------------

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging
const messaging = firebase.messaging();

// (This file is now correct. It uses importScripts
// and the "compat" version of Firebase, which is
// required for service workers.)



/*This file is likely untracked in Git because it's a service worker in the `public/` directory, which is typically excluded by default `.gitignore` rules in many projects.

Common reasons:
1. **`public/` folder excluded** - Some projects ignore the entire `public/` directory
2. **Environment/config files** - Service workers often contain sensitive config and are treated like environment files
3. **Build artifacts** - Some setups treat `public/` as auto-generated

To track it, you can either:
- Remove `public/` from `.gitignore` if appropriate
- Add a specific rule: `!public/firebase-messaging-sw.js`
- Check your `.gitignore` file to see what's actually excluding it

However, be cautious: this file contains your Firebase API key, which should be in environment variables instead of committed to Git. */