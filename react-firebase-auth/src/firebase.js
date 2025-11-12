// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// TODO: Add your own Firebase configuration from your project settings
const firebaseConfig = {
    apiKey: "dummy-api-key",
    authDomain: "dummy-auth-domain.firebaseapp.com",
    projectId: "dummy-project-id",
    storageBucket: "dummy-storage-bucket.appspot.com",
    messagingSenderId: "dummy-messaging-sender-id",
    appId: "dummy-app-id"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

if (window.location.hostname === 'localhost') {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
}


export { app, auth, db, functions };
