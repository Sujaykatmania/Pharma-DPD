// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYcfF9wWuqXsqFWgNxHFbN9Z8vAQE4gek",
  authDomain: "pharma-dpd.firebaseapp.com",
  projectId: "pharma-dpd",
  storageBucket: "pharma-dpd.firebasestorage.app",
  messagingSenderId: "918004985669",
  appId: "1:918004985669:web:f9d48e47e64caa32c5182c",
  measurementId: "G-DCL3M7FP6W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize all three services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "asia-south1"); 

// Connect to Emulators (this is our "localhost" fix)
if (window.location.hostname === 'localhost') {
  console.log("Using Firebase Emulators");
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
} else {
  console.log("Using Production Firebase");
}

// --- THIS IS THE FIX ---
// This line was missing, which caused the "does not provide an export" error.
export { auth, db, app, functions };