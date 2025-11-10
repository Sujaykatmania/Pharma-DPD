import React from 'react';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

const LoginPage = () => {

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists in Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // Create new user document
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    previous_ailments: []
                });
            }

        } catch (error) {
            console.error("Error signing in with Google: ", error);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen">
            <button
                onClick={handleGoogleSignIn}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Sign in with Google
            </button>
        </div>
    );
};

export  { LoginPage };
