import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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
                    gender: "",
                    allergies: [],
                    current_meds: [],
                    conditions: []
                });
            }

        } catch (error) {
            console.error("Error signing in with Google: ", error);
        }
    };

    const handleRegister = async () => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.email, // Using email as display name for email/password users
                gender: "",
                allergies: [],
                current_meds: [],
                conditions: []
            });
        } catch (error) {
            console.error("Error registering: ", error);
        }
    };

    const handleSignIn = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing in: ", error);
        }
    };

    return (
        <div className="flex flex-col justify-center items-center h-screen">
            <div className="p-8 bg-white rounded shadow-md w-80">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="mb-4 w-full p-2 border rounded"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="mb-4 w-full p-2 border rounded"
                />
                <button
                    onClick={handleSignIn}
                    className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-2"
                >
                    Sign In
                </button>
                <button
                    onClick={handleRegister}
                    className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mb-4"
                >
                    Register
                </button>
                <button
                    onClick={handleGoogleSignIn}
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export  { LoginPage };
