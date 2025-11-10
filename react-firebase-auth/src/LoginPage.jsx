import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleSignIn = async () => {
        setError(null);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
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
            setError('Failed to sign in with Google. Please try again.');
        }
    };

    const handleEmailPasswordAction = async (e) => {
        e.preventDefault();
        setError(null);
        if (isRegisterMode) {
            // Register
            try {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                const user = result.user;
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.email,
                    gender: "",
                    allergies: [],
                    current_meds: [],
                    conditions: []
                });
            } catch (error) {
                handleAuthError(error);
            }
        } else {
            // Sign In
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                handleAuthError(error);
            }
        }
    };

    const handleAuthError = (error) => {
        switch (error.code) {
            case 'auth/weak-password':
                setError('Password must be at least 6 characters.');
                break;
            case 'auth/invalid-email':
                setError('Please enter a valid email address.');
                break;
            case 'auth/email-already-in-use':
                setError('This email is already in use. Try signing in.');
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                setError('Invalid email or password.');
                break;
            default:
                setError('An unknown error occurred. Please try again.');
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center p-4">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white/20 backdrop-filter backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl">
                <div className="flex justify-center">
                    <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7v-2h4V7h2v4h4v2h-4v4h-2z" fill="currentColor"/>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-center text-white text-pop">{isRegisterMode ? 'Create Account' : 'Sign In'}</h2>
                <form onSubmit={handleEmailPasswordAction} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-4 py-2 text-slate-800 placeholder-gray-700 bg-white/30 border border-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {error && <p className="text-red-500 bg-white/80 rounded-md p-2 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-md transition duration-200"
                    >
                        {isRegisterMode ? 'Register' : 'Sign In'}
                    </button>
                </form>
                <div className="text-center">
                    <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-sm text-white hover:underline">
                        {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                    </button>
                </div>
                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-white/30"></div>
                    <span className="flex-shrink mx-4 text-white">Or</span>
                    <div className="flex-grow border-t border-white/30"></div>
                </div>
                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center py-2 px-4 bg-white/40 border border-white/50 shadow-lg transition-all duration-200 hover:bg-white/60 hover:shadow-xl active:scale-95 text-slate-800 font-medium rounded-md"
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 6.842C34.553 2.964 29.613 1 24 1C10.745 1 0 11.745 0 25s10.745 24 24 24s24-10.745 24-24c0-1.282-.124-2.528-.352-3.725H43.611z"/>
                        <path fill="#FF3D00" d="M6.306 14.691c-1.258 3.524-1.258 7.491 0 11.015L1.31 32.553C-1.218 26.21 2.38 10.153 10.59 4.414l5.122 5.122C12.83 11.037 8.35 12.33 6.306 14.691z"/>
                        <path fill="#4CAF50" d="M24 48c5.613 0 10.553-1.964 14.802-5.198l-5.198-5.198c-2.12 1.885-4.901 3.038-7.904 3.038-5.223 0-9.651-3.343-11.303-8H1.31l5.021 7.86C10.745 44.255 16.715 48 24 48z"/>
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.457-2.457 4.476-4.605 5.75l5.198 5.198c4.32-3.787 7.273-9.522 7.273-16.141c0-1.282-.124-2.528-.352-3.725z"/>
                    </svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export { LoginPage };
