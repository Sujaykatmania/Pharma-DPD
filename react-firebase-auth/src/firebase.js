// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "asia-south1"); 

// Connect to Emulators if on localhost
if (window.location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { auth, db, app, functions };
